import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import ClubLinksManager from '@/components/clubs/ClubLinksManager';
import { Toaster } from '@/components/ui/toaster';
import { clubLinksService, DEMO_CLUB_ID } from './clubLinksService.mjs';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function MemberPreview() {
  const { data: links = [] } = useQuery({ queryKey: ['club-quick-links'], queryFn: () => clubLinksService.listVisible(DEMO_CLUB_ID) });
  return <section className="rounded-lg border p-5"><h2 className="mb-3 text-xl font-semibold">Member view</h2>
    {links.length ? links.map(link => <div key={link.id} className="mb-2 rounded border p-3"><strong>{link.title}</strong><p>{link.subtitle}</p><p className="text-xs text-muted-foreground">{link.url}</p></div>) : <p className="text-muted-foreground">Visible links will appear here.</p>}
  </section>;
}
export default function LabApp() {
  return <QueryClientProvider client={queryClient}><main className="mx-auto max-w-4xl space-y-6 p-6">
    <header><h1 className="text-3xl font-bold">Ignite ICP Lab</h1><p className="mt-2 text-muted-foreground">Club Info & Links · Synthetic demo · Changes reset on reload</p></header>
    <ClubLinksManager clubId={DEMO_CLUB_ID} /><MemberPreview />
    <p className="text-sm text-muted-foreground">External link opening is disabled in this lab.</p>
    <Toaster />
  </main></QueryClientProvider>;
}
