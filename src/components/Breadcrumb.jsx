import React from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs, Typography, Box } from "@mui/material";
import { ChevronRight, Home } from "lucide-react";

/**
 * Breadcrumb Component
 *
 * @param {Array} items - Array of breadcrumb items
 *   Each item: { label: string, path?: string, icon?: LucideIcon }
 * @param {boolean} showHome - Show home icon as first item (default: true)
 * @param {string} homePath - Path for home link (default: "/")
 * @param {string} homeLabel - Label for home (default: "Home")
 *
 * @example
 * const items = [
 *   { label: "Training", path: "/training" },
 *   { label: "Add Training" },
 * ];
 * <Breadcrumb items={items} />
 *
 * @example - without home icon
 * <Breadcrumb items={items} showHome={false} />
 *
 * @example - with custom icon per item
 * import { GraduationCap } from "lucide-react";
 * const items = [{ label: "Training", path: "/training", icon: GraduationCap }];
 * <Breadcrumb items={items} />
 */

const Breadcrumb = ({
  items = [],
  showHome = true,
  homePath = "/",
  homeLabel = "Home",
}) => {
  const allCrumbs = showHome
    ? [{ label: homeLabel, path: homePath, icon: Home }, ...items]
    : items;

  return (
    <Box
      sx={{
        mb: { xs: 2, sm: 2.5 },
        overflowX: "auto",
        whiteSpace: "nowrap",
        "&::-webkit-scrollbar": { display: "none" },
        msOverflowStyle: "none",
        scrollbarWidth: "none",
      }}
    >
      <Breadcrumbs
        separator={<ChevronRight size={13} color="#94a3b8" />}
        sx={{
          "& .MuiBreadcrumbs-ol": { flexWrap: "nowrap", alignItems: "center" },
          "& .MuiBreadcrumbs-separator": { mx: 0.25 },
          "& .MuiBreadcrumbs-li": { display: "flex", alignItems: "center" },
        }}
      >
        {allCrumbs.map((crumb, index) => {
          const isLast = index === allCrumbs.length - 1;
          const Icon = crumb.icon;

          if (isLast) {
            return (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1,
                  py: 0.4,
                  borderRadius: "6px",
                  background: "#e2f8e2",
                }}
              >
                {Icon && <Icon size={13} color="#4CAF50" />}
                <Typography
                  sx={{
                    fontSize: { xs: 12, sm: 13 },
                    fontWeight: 600,
                    color: "#4CAF50",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {crumb.label}
                </Typography>
              </Box>
            );
          }

          return crumb.path ? (
            <Link
              key={index}
              to={crumb.path}
              style={{ textDecoration: "none" }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  color: "#64748b",
                  transition: "color 0.15s",
                  "&:hover": { color: "#4CAF50" },
                }}
              >
                {Icon && <Icon size={13} />}
                <Typography
                  sx={{
                    fontSize: { xs: 12, sm: 13 },
                    fontWeight: 500,
                    color: "inherit",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {crumb.label}
                </Typography>
              </Box>
            </Link>
          ) : (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                color: "#64748b",
              }}
            >
              {Icon && <Icon size={13} />}
              <Typography
                sx={{
                  fontSize: { xs: 12, sm: 13 },
                  fontWeight: 500,
                  color: "inherit",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {crumb.label}
              </Typography>
            </Box>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};

export default Breadcrumb;
