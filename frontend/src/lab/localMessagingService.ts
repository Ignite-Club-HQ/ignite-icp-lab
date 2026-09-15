import { Actor } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { idlFactory } from './bindings/messaging_domain/declarations/messaging_domain.did.js';
import type { Conversation, Message as IcpMessage, _SERVICE } from './bindings/messaging_domain/declarations/messaging_domain.did.js';
import { createLocalAgent, fetchLocalLabConfig } from './localActor';

export interface LocalChatMessage {
  id: string;
  team_id: string;
  author_id: string;
  text: string;
  image_url: null;
  reply_to_id: null;
  created_at: string;
  reactions: [];
  profiles: { display_name: string; avatar_url: null };
}

function convertMessage(message: IcpMessage, teamId: string): LocalChatMessage {
  return {
    id: message.id,
    team_id: teamId,
    author_id: message.sender.toText(),
    text: message.body,
    image_url: null,
    reply_to_id: null,
    created_at: new Date(Number(message.sequence)).toISOString(),
    reactions: [],
    profiles: { display_name: message.sender.toText(), avatar_url: null },
  };
}

export function createMessagingDomainClient(
  actor: Pick<_SERVICE, 'export_state' | 'list_messages' | 'send_message' | 'mark_read' | 'unread_count'>,
) {
  return {
    async findTeamConversation(teamId: string): Promise<Conversation> {
      const result = await actor.export_state();
      if ('Err' in result) throw new Error(result.Err);
      const conversation = result.Ok.conversations.find((candidate) => candidate.team_id[0] === teamId);
      if (!conversation) throw new Error('Local team conversation not found');
      return conversation;
    },
    async listTeamMessages(teamId: string): Promise<LocalChatMessage[]> {
      const conversation = await this.findTeamConversation(teamId);
      const messages = await actor.list_messages(conversation.id, []);
      return messages.map((message) => convertMessage(message, teamId));
    },
    async sendTeamMessage(teamId: string, text: string, idempotencyKey: string): Promise<LocalChatMessage> {
      const conversation = await this.findTeamConversation(teamId);
      const result = await actor.send_message(conversation.id, text, idempotencyKey);
      if ('Err' in result) throw new Error(result.Err);
      return convertMessage(result.Ok, teamId);
    },
    async getTeamUnreadCount(teamId: string): Promise<number> {
      const conversation = await this.findTeamConversation(teamId);
      const result = await actor.unread_count(conversation.id);
      if ('Err' in result) throw new Error(result.Err);
      return Number(result.Ok.count);
    },
    async markTeamRead(teamId: string, messageId: string): Promise<void> {
      const conversation = await this.findTeamConversation(teamId);
      const result = await actor.mark_read(conversation.id, messageId);
      if ('Err' in result) throw new Error(result.Err);
    },
  };
}

async function connectMessagingActor(persona: string): Promise<_SERVICE> {
  const config = await fetchLocalLabConfig();
  const messagingCanisterId = config.canisterIds?.messaging_domain ?? config.canisterIds?.messaging_domain_motoko;
  if (!messagingCanisterId) throw new Error('Local messaging domain canister is not configured.');
  const agent = await createLocalAgent(config, persona, location.origin);
  return Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: Principal.fromText(messagingCanisterId),
  });
}

export async function listLocalTeamMessages(persona: string, teamId: string): Promise<LocalChatMessage[]> {
  return createMessagingDomainClient(await connectMessagingActor(persona)).listTeamMessages(teamId);
}

export async function sendLocalTeamMessage(persona: string, teamId: string, text: string, idempotencyKey: string): Promise<LocalChatMessage> {
  return createMessagingDomainClient(await connectMessagingActor(persona)).sendTeamMessage(teamId, text, idempotencyKey);
}

export async function getLocalTeamUnreadCount(persona: string, teamId: string): Promise<number> {
  return createMessagingDomainClient(await connectMessagingActor(persona)).getTeamUnreadCount(teamId);
}

export async function markLocalTeamRead(persona: string, teamId: string, messageId: string): Promise<void> {
  return createMessagingDomainClient(await connectMessagingActor(persona)).markTeamRead(teamId, messageId);
}
