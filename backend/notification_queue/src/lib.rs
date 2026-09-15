use candid::Principal;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum JobStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NotificationJob {
    pub id: String,
    pub recipient: Principal,
    pub scope: String,
    pub run_at_ms: u64,
    pub idempotency_key: String,
    pub status: JobStatus,
    pub attempts: u32,
    pub last_error: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WorkerCapability {
    pub worker: Principal,
    pub scope: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NotificationQueue {
    governor: Principal,
    workers: Vec<WorkerCapability>,
    jobs: Vec<NotificationJob>,
}

impl NotificationQueue {
    pub fn new(governor: Principal) -> Self {
        Self {
            governor,
            workers: vec![],
            jobs: vec![],
        }
    }

    pub fn initialize(&mut self, actor: Principal) -> Result<(), String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated caller required".into());
        }
        if self.governor != actor {
            return Err("Governor required".into());
        }
        Ok(())
    }

    pub fn grant_worker(&mut self, actor: Principal, worker: Principal) -> Result<(), String> {
        self.grant_worker_scope(actor, worker, "*")
    }

    pub fn grant_worker_scope(
        &mut self,
        actor: Principal,
        worker: Principal,
        scope: &str,
    ) -> Result<(), String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated caller required".into());
        }
        if actor != self.governor {
            return Err("Governor required".into());
        }
        if worker == Principal::anonymous() {
            return Err("Invalid worker".into());
        }
        if scope.trim().is_empty() {
            return Err("Invalid worker scope".into());
        }
        if !self
            .workers
            .iter()
            .any(|capability| capability.worker == worker && capability.scope == scope)
        {
            self.workers.push(WorkerCapability {
                worker,
                scope: scope.to_string(),
            });
        }
        Ok(())
    }

    pub fn schedule(
        &mut self,
        actor: Principal,
        id: &str,
        recipient: Principal,
        scope: &str,
        run_at_ms: u64,
        idempotency_key: &str,
    ) -> Result<NotificationJob, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated caller required".into());
        }
        if recipient == Principal::anonymous() {
            return Err("Invalid recipient".into());
        }
        if self.jobs.iter().any(|job| job.id == id) {
            return Ok(self.jobs.iter().find(|job| job.id == id).unwrap().clone());
        }
        let job = NotificationJob {
            id: id.to_string(),
            recipient,
            scope: scope.to_string(),
            run_at_ms,
            idempotency_key: idempotency_key.to_string(),
            status: JobStatus::Pending,
            attempts: 0,
            last_error: None,
        };
        self.jobs.push(job.clone());
        Ok(job)
    }

    pub fn claim(
        &mut self,
        actor: Principal,
        now_ms: u64,
        limit: usize,
    ) -> Result<Vec<NotificationJob>, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated caller required".into());
        }
        if actor != self.governor
            && !self
                .workers
                .iter()
                .any(|capability| capability.worker == actor)
        {
            return Err("Worker capability required".into());
        }
        let governor = self.governor;
        let workers = self.workers.clone();
        let mut claimed = Vec::new();
        for job in self.jobs.iter_mut() {
            if claimed.len() >= limit {
                break;
            }
            let scope_allowed = actor == governor
                || workers.iter().any(|capability| {
                    capability.worker == actor
                        && (capability.scope == "*" || capability.scope == job.scope)
                });
            if job.status == JobStatus::Pending
                && job.run_at_ms <= now_ms
                && job.attempts < 5
                && scope_allowed
            {
                job.status = JobStatus::Processing;
                job.attempts += 1;
                claimed.push(job.clone());
            }
        }
        Ok(claimed)
    }

    pub fn complete(
        &mut self,
        actor: Principal,
        id: &str,
        expected_key: &str,
    ) -> Result<NotificationJob, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated caller required".into());
        }
        if actor != self.governor
            && !self
                .workers
                .iter()
                .any(|capability| capability.worker == actor)
        {
            return Err("Worker capability required".into());
        }
        let index = self
            .jobs
            .iter()
            .position(|job| job.id == id)
            .ok_or("Unknown job")?;
        let status = &self.jobs[index].status;
        if self.jobs[index].idempotency_key != expected_key {
            return Err("Idempotency key mismatch".into());
        }
        if *status != JobStatus::Processing {
            return Err("Job is not processing".into());
        }
        self.jobs[index].status = JobStatus::Completed;
        Ok(self.jobs[index].clone())
    }

    pub fn fail(
        &mut self,
        actor: Principal,
        id: &str,
        error: &str,
        retry_at_ms: Option<u64>,
    ) -> Result<NotificationJob, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated caller required".into());
        }
        if actor != self.governor
            && !self
                .workers
                .iter()
                .any(|capability| capability.worker == actor)
        {
            return Err("Worker capability required".into());
        }
        let index = self
            .jobs
            .iter()
            .position(|job| job.id == id)
            .ok_or("Unknown job")?;
        if self.jobs[index].status != JobStatus::Processing {
            return Err("Job is not processing".into());
        }
        self.jobs[index].last_error = Some(error.to_string());
        self.jobs[index].status = if retry_at_ms.is_some() && self.jobs[index].attempts < 5 {
            JobStatus::Pending
        } else {
            JobStatus::Failed
        };
        if let Some(run_at_ms) = retry_at_ms {
            self.jobs[index].run_at_ms = run_at_ms;
        }
        Ok(self.jobs[index].clone())
    }

    pub fn list_jobs(&self, actor: Principal) -> Result<Vec<NotificationJob>, String> {
        if actor == Principal::anonymous() {
            return Err("Authenticated caller required".into());
        }
        if actor != self.governor
            && !self
                .workers
                .iter()
                .any(|capability| capability.worker == actor)
        {
            return Err("Worker capability required".into());
        }
        Ok(self.jobs.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn worker_claim_and_complete_flow() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let worker = Principal::from_slice(&[2u8; 29]);
        let recipient = Principal::from_slice(&[3u8; 29]);
        let mut queue = NotificationQueue::new(governor);
        queue.grant_worker(governor, worker).unwrap();
        queue
            .schedule(governor, "job-1", recipient, "email", 0, "idempotent-a")
            .unwrap();
        let claimed = queue.claim(worker, 1, 10).unwrap();
        assert_eq!(claimed[0].status, JobStatus::Processing);
        let completed = queue.complete(worker, "job-1", "idempotent-a").unwrap();
        assert_eq!(completed.status, JobStatus::Completed);
    }

    #[test]
    fn failed_job_retries_with_backoff_and_does_not_double_complete() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let worker = Principal::from_slice(&[2u8; 29]);
        let recipient = Principal::from_slice(&[3u8; 29]);
        let mut queue = NotificationQueue::new(governor);
        queue.grant_worker(governor, worker).unwrap();
        queue
            .schedule(governor, "job-2", recipient, "push", 0, "idempotent-b")
            .unwrap();
        queue.claim(worker, 1, 10).unwrap();
        queue
            .fail(worker, "job-2", "temporary outage", Some(50))
            .unwrap();
        assert_eq!(queue.jobs[0].status, JobStatus::Pending);
        let claimed_again = queue.claim(worker, 51, 10).unwrap();
        assert_eq!(claimed_again[0].status, JobStatus::Processing);
        assert!(queue.complete(worker, "job-2", "idempotent-b").is_ok());
        assert!(queue.complete(worker, "job-2", "idempotent-b").is_err());
    }

    #[test]
    fn scoped_worker_only_claims_matching_notification_domain() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let worker = Principal::from_slice(&[2u8; 29]);
        let recipient = Principal::from_slice(&[3u8; 29]);
        let mut queue = NotificationQueue::new(governor);
        queue.grant_worker_scope(governor, worker, "push").unwrap();
        queue
            .schedule(governor, "email-job", recipient, "email", 0, "email-key")
            .unwrap();
        queue
            .schedule(governor, "push-job", recipient, "push", 0, "push-key")
            .unwrap();
        let claimed = queue.claim(worker, 1, 10).unwrap();
        assert_eq!(claimed.len(), 1);
        assert_eq!(claimed[0].scope, "push");
        assert_eq!(
            queue
                .jobs
                .iter()
                .find(|job| job.id == "email-job")
                .unwrap()
                .status,
            JobStatus::Pending
        );
    }

    #[test]
    fn worker_scope_must_not_be_empty() {
        let governor = Principal::from_slice(&[1u8; 29]);
        let worker = Principal::from_slice(&[2u8; 29]);
        let mut queue = NotificationQueue::new(governor);
        assert!(queue.grant_worker_scope(governor, worker, " ").is_err());
    }
}
