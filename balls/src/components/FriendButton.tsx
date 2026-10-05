import { Check, Clock, UserPlus } from 'lucide-react';
import { acceptFriendRequest, sendFriendRequest } from '../state/actions';
import { type AppState, useApp } from '../state/store';
import { needsAccount } from './Join';
import { Button } from './ui';

export type FriendStatus = 'friends' | 'sent' | 'received' | 'none';

export function friendStatus(s: AppState, userId: string): FriendStatus {
  if (s.friends.includes(userId)) return 'friends';
  const r = s.friendRequests.find((x) => x.userId === userId);
  if (r) return r.dir === 'out' ? 'sent' : 'received';
  return 'none';
}

/** Add / Requested / Accept / Friends, depending on where things stand. */
export function FriendButton({ userId, size = 'sm', block }: { userId: string; size?: 'sm' | 'md'; block?: boolean }) {
  const s = useApp();
  const st = friendStatus(s, userId);
  if (st === 'friends')
    return (
      <Button size={size} variant="secondary" block={block} icon={<Check size={15} />} disabled>
        Friends
      </Button>
    );
  if (st === 'sent')
    return (
      <Button size={size} variant="secondary" block={block} icon={<Clock size={15} />} disabled>
        Requested
      </Button>
    );
  if (st === 'received')
    return (
      <Button size={size} block={block} onClick={() => acceptFriendRequest(userId)}>
        Accept
      </Button>
    );
  return (
    <Button size={size} variant="accent" block={block} icon={<UserPlus size={15} />} onClick={() => !needsAccount('follow') && sendFriendRequest(userId)}>
      Add
    </Button>
  );
}
