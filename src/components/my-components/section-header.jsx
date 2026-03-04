"use client";

import { Stack, Typography } from "@mui/material";

import { Iconify } from "../iconify";

const SectionHeader = ({ icon, title }) => (
  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
    <Iconify icon={icon} width={20} sx={{ color: "primary.main" }} />
    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
      {title}
    </Typography>
  </Stack>
);

export default SectionHeader;
