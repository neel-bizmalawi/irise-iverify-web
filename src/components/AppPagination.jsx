import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

const iconBtnSx = (disabled) => ({
  width: 32,
  height: 32,
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  background: disabled ? "#f8fafc" : "#fff",
  color: disabled ? "#cbd5e1" : "#475569",
  transition: "all 0.15s",
  "&:hover": {
    background: disabled ? "#f8fafc" : "#f1f5f9",
    borderColor: disabled ? "#e2e8f0" : "#cbd5e1",
  },
});
const AppPagination = ({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  const goTo = (p) => {
    if (p < 1 || p > totalPages) return;
    onPageChange?.(p);
  };

  const getPageNumbers = () => {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, "...", totalPages];
    if (page >= totalPages - 2)
      return [
        1,
        "...",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: { xs: 1.5, sm: 2 },
        mt: 2,
        px: { xs: 0, sm: 0.5 },
      }}
    >
      {/* Left — showing X to Y of Z */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Typography
          sx={{
            fontSize: { xs: 12, sm: 13 },
            color: "#64748b",
            whiteSpace: "nowrap",
          }}
        >
          {totalItems === 0
            ? "No records"
            : `Showing ${from}–${to} of ${totalItems}`}
        </Typography>

        {!isMobile && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              sx={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" }}
            >
              Rows per page
            </Typography>
            <Select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(e.target.value)}
              size="small"
              sx={{
                fontSize: 12,
                height: 30,
                borderRadius: "8px",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#e2e8f0",
                },
                "& .MuiSelect-select": { py: 0.5, px: 1.2 },
              }}
            >
              {pageSizeOptions.map((opt) => (
                <MenuItem key={opt} value={opt} sx={{ fontSize: 13 }}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}
      </Box>

      {/* Right — page controls */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        {/* First page */}
        <IconButton
          size="small"
          disabled={page === 1}
          onClick={() => goTo(1)}
          sx={iconBtnSx(page === 1)}
        >
          <ChevronsLeft size={15} />
        </IconButton>

        {/* Prev */}
        <IconButton
          size="small"
          disabled={page === 1}
          onClick={() => goTo(page - 1)}
          sx={iconBtnSx(page === 1)}
        >
          <ChevronLeft size={15} />
        </IconButton>

        {/* Page numbers — hidden on mobile, show current/total instead */}
        {isMobile ? (
          <Typography
            sx={{
              fontSize: 12,
              color: "#475569",
              fontWeight: 600,
              px: 1,
              whiteSpace: "nowrap",
            }}
          >
            {page} / {totalPages}
          </Typography>
        ) : (
          getPageNumbers().map((p, i) =>
            p === "..." ? (
              <Typography
                key={`dots-${i}`}
                sx={{ fontSize: 13, color: "#94a3b8", px: 0.5 }}
              >
                ...
              </Typography>
            ) : (
              <IconButton
                key={p}
                size="small"
                onClick={() => goTo(p)}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  border: "1px solid",
                  fontSize: 13,
                  fontWeight: p === page ? 700 : 500,
                  borderColor: p === page ? "#4CAF50" : "#e2e8f0",
                  background: p === page ? "#4CAF50" : "#fff",
                  color: p === page ? "#fff" : "#475569",
                  transition: "all 0.15s",
                  "&:hover": {
                    background: p === page ? "#4CAF50" : "#f1f5f9",
                    borderColor: p === page ? "#4CAF50" : "#cbd5e1",
                  },
                }}
              >
                {p}
              </IconButton>
            ),
          )
        )}

        {/* Next */}
        <IconButton
          size="small"
          disabled={page === totalPages}
          onClick={() => goTo(page + 1)}
          sx={iconBtnSx(page === totalPages)}
        >
          <ChevronRight size={15} />
        </IconButton>

        {/* Last page */}
        <IconButton
          size="small"
          disabled={page === totalPages}
          onClick={() => goTo(totalPages)}
          sx={iconBtnSx(page === totalPages)}
        >
          <ChevronsRight size={15} />
        </IconButton>
      </Box>

      {/* Mobile rows per page */}
      {isMobile && (
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}
        >
          <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>
            Rows per page
          </Typography>
          <Select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(e.target.value)}
            size="small"
            sx={{
              fontSize: 12,
              height: 30,
              borderRadius: "8px",
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e2e8f0" },
              "& .MuiSelect-select": { py: 0.5, px: 1.2 },
            }}
          >
            {pageSizeOptions.map((opt) => (
              <MenuItem key={opt} value={opt} sx={{ fontSize: 13 }}>
                {opt}
              </MenuItem>
            ))}
          </Select>
        </Box>
      )}
    </Box>
  );
};

export default AppPagination;
