'use client';

const { Box, Chip } = require("@mui/material");

import { stringToArray } from "src/utils/helper";

export default function TextToChip({ text="",sx={} }) {
    const items = stringToArray(text);

  return (
  <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        flexWrap: "wrap",
        ...sx,
      }}
    >
      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
        {items.map((it, i) => (
          <Chip
            key={i}
            label={it}
            size="small"
            sx={(theme) => ({
              px: 1,
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 1.5,
              backgroundColor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.08)"
                  : "#F4F6F8",
              color: theme.palette.text.primary,
              textTransform:"capitalize",
              border:
                theme.palette.mode === "dark"
                  ? "1px solid rgba(255,255,255,0.14)"
                  : "1px solid #E5E7EB",
            })}
          />
        ))}
      </Box>
    </Box>
  );
}