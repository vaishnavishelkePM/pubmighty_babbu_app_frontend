
import { EmptyContent } from '../empty-content';

// ----------------------------------------------------------------------

export function NoData({ notFound, sx }) {
  return notFound ? <EmptyContent filled sx={{ py: 10, ...sx }} /> : null;
}
