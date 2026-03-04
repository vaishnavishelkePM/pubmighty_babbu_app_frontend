'use client';

import * as React from 'react';

import {
  Table,
  TableRow,
  Skeleton,
  TableCell,
  TableHead,
  TableBody,
  TableContainer,
} from '@mui/material';

export default function TableSkeleton({
  rows = 8,
  cols = 6,
  includeHeader = true,
  dense = false,        // compact height
  rounded = false,       // rounded vs text line style
}) {
  const heights = dense ? { cell: 28, header: 18 } : { cell: 36, header: 20 };
  const widths = [32, 56, 72, 44, 65, 50, 38, 60, 80, 35]; // % widths to vary columns

  const CellSkeleton = ({ header = false, index = 0 }) => (
    <Skeleton
      variant={rounded ? 'rounded' : 'text'}
      animation="wave"
      height={header ? heights.header : heights.cell}
      sx={{
        width: '100%',
      }}
    />
  );

  return (
    <TableContainer>
      <Table>
        {includeHeader && (
          <TableHead>
            <TableRow>
              {Array.from({ length: cols }).map((_, c) => (
                <TableCell key={`h-${c}`}>
                  <CellSkeleton header index={c} />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        )}

        <TableBody>
          {Array.from({ length: rows }).map((_, r) => (
            <TableRow hover key={`r-${r}`}>
              {Array.from({ length: cols }).map((_, c) => (
                <TableCell key={`r-${r}-c-${c}`} sx={{
                    minWidth:"150px"
                }}>
                  <CellSkeleton index={c} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
