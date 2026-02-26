import React from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Skeleton,
  Chip,
} from "@mui/material";
import { Inbox } from "lucide-react";

const headerSx = {
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  py: 1.5,
  whiteSpace: "nowrap",
};

const cellSx = {
  fontSize: 13.5,
  color: "#1e293b",
  borderBottom: "1px solid #f1f5f9",
  py: 1.5,
};

const AppTable = ({
  columns = [],
  data = [],
  loading = false,
  emptyText = "No data found",
  rowKey = "id",
}) => {
  const skeletonRows = Array.from({ length: 5 });
  return (
    <Box
      sx={{
        background: "#fff",
        borderRadius: "14px",
        border: "1px solid #e2e8f0",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <TableContainer
        sx={{
          maxHeight: 640,
          minHeight: 640,
          overflowY: "auto",
          overflowX: "auto",
          "&::-webkit-scrollbar": { height: 5, width: 6 },
          "&::-webkit-scrollbar-track": { background: "#f1f5f9" },
          "&::-webkit-scrollbar-thumb": {
            background: "#cbd5e1",
            borderRadius: 4,
          },
        }}
      >
        <Table stickyHeader sx={{ minWidth: { xs: 500, sm: "100%" } }}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align || "left"}
                  sx={{ ...headerSx, width: col.width || "auto" }}
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              skeletonRows.map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key} sx={cellSx}>
                      <Skeleton
                        variant="rounded"
                        height={18}
                        sx={{ borderRadius: "6px", bgcolor: "#f1f5f9" }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  sx={{ border: "none", py: 6 }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1.5,
                      color: "#94a3b8",
                    }}
                  >
                    <Inbox size={36} strokeWidth={1.3} />
                    <Typography
                      sx={{ fontSize: 14, fontWeight: 500, color: "#94a3b8" }}
                    >
                      {emptyText}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIndex) => (
                <TableRow
                  key={row[rowKey] ?? rowIndex}
                  sx={{
                    transition: "background 0.15s",
                    "&:hover": { background: "#f8fafc" },
                    "&:last-child td": { borderBottom: "none" },
                  }}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      align={col.align || "left"}
                      sx={cellSx}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : (row[col.key] ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AppTable;
