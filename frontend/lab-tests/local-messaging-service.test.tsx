import { describe, expect, test, vi } from 'vitest';
import { Principal } from '@icp-sdk/core/principal';
import { createMessagingDomainClient } from '../src/lab/localMessagingService';
import type { _SERVICE } from '../src/lab/bindings/messaging_domain/declarations/messaging_domain.did.js';

const principal = Principal.fromText('aaaaa-aa');

describe('local messaging service', () => {
  test('lists team conversation messages without Supabase', async () => {
    const exportState = vi.fn(async () => ({
      Ok: {
        schema: 1,
        governor: principal,
        conversations: [
          { id: 'conversation-1', club_id: 'club-1', team_id: ['team-1'], participants: [principal], next_sequence: 2n },
        ],
        messages: [],
        unread: [],
        receipts: [],
      },
    }));
    const listMessages = vi.fn(async () => [{
      id: 'message-1',
      conversation_id: 'conversation-1',
      body: 'Hello',
      sender: principal,
      sequence: 1n,
      idempotency_key: 'key-1',
    }]);
    const client = createMessagingDomainClient({
      export_state: exportState,
      list_messages: listMessages,
      send_message: vi.fn(),
    } as unknown as _SERVICE);

    await expect(client.listTeamMessages('team-1')).resolves.toMatchObject([
      { id: 'message-1', team_id: 'team-1', text: 'Hello', author_id: principal.toText() },
    ]);
    expect(listMessages).toHaveBeenCalledWith('conversation-1', []);
  });

  test('sends an idempotent team message through the local actor', async () => {
    const sendMessage = vi.fn(async () => ({
      Ok: {
        id: 'message-2',
        conversation_id: 'conversation-1',
        body: 'Hi',
        sender: principal,
        sequence: 2n,
        idempotency_key: 'key-2',
      },
    }));
    const client = createMessagingDomainClient({
      export_state: vi.fn(async () => ({
        Ok: {
          schema: 1,
          governor: principal,
          conversations: [
            { id: 'conversation-1', club_id: 'club-1', team_id: ['team-1'], participants: [principal], next_sequence: 2n },
          ],
          messages: [],
          unread: [],
          receipts: [],
        },
      })),
      list_messages: vi.fn(),
      send_message: sendMessage,
    } as unknown as _SERVICE);

    await expect(client.sendTeamMessage('team-1', 'Hi', 'key-2')).resolves.toMatchObject({ id: 'message-2', text: 'Hi' });
    expect(sendMessage).toHaveBeenCalledWith('conversation-1', 'Hi', 'key-2');
  });
});
