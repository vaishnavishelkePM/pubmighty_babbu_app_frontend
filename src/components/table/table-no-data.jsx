import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

import { EmptyContent } from '../empty-content';

// ----------------------------------------------------------------------

export function TableNoData({ notFound, columns=12 ,sx }) {
  return (
    <TableRow>
      {notFound ? (
        <TableCell colSpan={columns}>
          <EmptyContent filled sx={{ py: 10, ...sx }} />
        </TableCell>
      ) : (
        <TableCell colSpan={columns} sx={{ p: 0 }} />
      )}
    </TableRow>
  );
}
