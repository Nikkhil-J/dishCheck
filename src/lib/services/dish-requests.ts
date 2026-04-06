import { dishRequestRepository } from '@/lib/repositories'

export function getPendingRequests() {
  return dishRequestRepository.getPending()
}

