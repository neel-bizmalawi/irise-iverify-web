import React, { useState } from "react";
import {
  Outlet,
  NavLink,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Avatar,
  Tooltip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Menu,
  MenuItem,
  ListItemIcon as MuiListItemIcon,
} from "@mui/material";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Menu as MenuIcon,
  X,
  ChevronDown,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  LogOut,
  UserCircle,
} from "lucide-react";
import eStove from "../assets/images/eStove.png";
import eStoveFire from "../assets/images/eStoveFire.png";

// ─── Theme ────────────────────────────────────────────────────────────────────
const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2563eb",
      light: "#3b82f6",
      dark: "#1d4ed8",
      contrastText: "#ffffff",
    },
    secondary: { main: "#7c3aed" },
    background: { default: "#f1f5f9", paper: "#ffffff" },
  },
  typography: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    h6: { fontWeight: 700 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
      },
    },
  },
});

// ─── Constants ────────────────────────────────────────────────────────────────
const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 72;

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: GraduationCap, label: "Training", path: "/training" },
  { icon: Shield, label: "Beneficiary", path: "/beneficiary" },
  { icon: Users, label: "Users", path: "/users" },
];

const bottomNavItems = [
  { icon: Settings, label: "Settings", path: "/settings" },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const SidebarContent = ({
  collapsed,
  onClose,
  onToggle,
  isMobile,
  onLogout,
}) => {
  const location = useLocation();
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);

  // Read user info from localStorage (set during login)
  const userName = localStorage.getItem("userName") || "User";
  const userRole = localStorage.getItem("role") || "user";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  const handleProfileClick = (e) => {
    setProfileMenuAnchor(e.currentTarget);
  };

  const handleProfileClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleLogoutClick = () => {
    handleProfileClose();
    onLogout();
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #0f172a 0%, #1a2744 100%)",
        overflowX: "hidden",
      }}
    >
      {/* ── Header / Logo ── */}
      <Box
        sx={{
          height: 64,
          display: "flex",
          alignItems: "center",
          px: collapsed ? 0 : 2,
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 1.5,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            transition: "all 0.3s ease",
            width: collapsed ? 36 : 140,
            height: 36,
          }}
        >
          <Box
            component="img"
            src={collapsed ? eStoveFire : eStove}
            alt="logo"
            sx={{
              height: "100%",
              width: "auto",
              maxWidth: "none",
              objectFit: "contain",
              transition: "all 0.3s ease",
            }}
          />
        </Box>

        {isMobile ? (
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: "#64748b", ml: "auto" }}
          >
            <X size={18} />
          </IconButton>
        ) : (
          !collapsed && (
            <IconButton
              onClick={onToggle}
              size="small"
              sx={{ color: "#64748b", ml: "auto" }}
            >
              <PanelLeftClose size={18} />
            </IconButton>
          )
        )}
      </Box>

      {/* ── Nav Items ── */}
      <Box sx={{ flex: 1, py: 1.5, overflowY: "auto", overflowX: "hidden" }}>
        <List disablePadding>
          {navItems.map(({ icon: Icon, label, path }) => (
            <ListItem key={path} disablePadding>
              <Tooltip title={collapsed ? label : ""} placement="right" arrow>
                <ListItemButton
                  component={NavLink}
                  to={path}
                  onClick={isMobile ? onClose : undefined}
                  sx={{
                    mx: 1,
                    my: "2px",
                    borderRadius: "10px",
                    py: 1.2,
                    px: collapsed ? 0 : 1.5,
                    justifyContent: collapsed ? "center" : "flex-start",
                    background: isActive(path) ? "#4CAF50" : "transparent",
                    boxShadow: isActive(path)
                      ? "0 4px 12px rgba(37,99,235,0.3)"
                      : "none",
                    textDecoration: "none",
                    "&:hover": {
                      background: isActive(path)
                        ? "#4CAF50"
                        : "rgba(255,255,255,0.05)",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 0 : 38,
                      color: isActive(path) ? "#fff" : "#64748b",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={20} />
                  </ListItemIcon>

                  {!collapsed && (
                    <ListItemText
                      primary={label}
                      primaryTypographyProps={{
                        fontSize: 14,
                        fontWeight: isActive(path) ? 600 : 500,
                        color: isActive(path) ? "#fff" : "#94a3b8",
                        lineHeight: 1.2,
                      }}
                    />
                  )}

                  {isActive(path) && !collapsed && (
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#93c5fd",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

      {/* ── Bottom: Settings + Profile ── */}
      <Box sx={{ py: 1.5 }}>
        <List disablePadding>
          {bottomNavItems.map(({ icon: Icon, label, path }) => (
            <ListItem key={path} disablePadding>
              <Tooltip title={collapsed ? label : ""} placement="right" arrow>
                <ListItemButton
                  component={NavLink}
                  to={path}
                  onClick={isMobile ? onClose : undefined}
                  sx={{
                    mx: 1,
                    borderRadius: "10px",
                    py: 1.2,
                    px: collapsed ? 0 : 1.5,
                    justifyContent: collapsed ? "center" : "flex-start",
                    textDecoration: "none",
                    "&:hover": { background: "rgba(255,255,255,0.05)" },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 0 : 38,
                      color: "#64748b",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={20} />
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={label}
                      primaryTypographyProps={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "#94a3b8",
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          ))}
        </List>

        {/* Profile Card */}
        {!collapsed ? (
          <Box
            onClick={handleProfileClick}
            sx={{
              mx: 1,
              mt: 1,
              p: 1.5,
              borderRadius: "10px",
              background: "rgba(255,255,255,0.04)",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              cursor: "pointer",
              transition: "background 0.2s",
              "&:hover": { background: "rgba(255,255,255,0.08)" },
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                background: "#4CAF50",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  color: "#e2e8f0",
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {userName}
              </Typography>
              <Typography
                sx={{
                  color: "#64748b",
                  fontSize: 11,
                  lineHeight: 1.4,
                  textTransform: "capitalize",
                }}
              >
                {userRole}
              </Typography>
            </Box>
            <ChevronDown size={14} color="#4CAF50" />
          </Box>
        ) : (
          <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
            <Tooltip title={userName} placement="right" arrow>
              <Avatar
                onClick={handleProfileClick}
                sx={{
                  width: 32,
                  height: 32,
                  background: "#4CAF50",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {initials}
              </Avatar>
            </Tooltip>
          </Box>
        )}

        {/* Profile Dropdown Menu */}
        <Menu
          anchorEl={profileMenuAnchor}
          open={Boolean(profileMenuAnchor)}
          onClose={handleProfileClose}
          PaperProps={{
            elevation: 4,
            sx: {
              width: 200,
              borderRadius: 2,
              mt: -1,
              ml: collapsed ? 1 : 0,
              border: "1px solid #e2e8f0",
              "& .MuiMenuItem-root": {
                fontSize: 14,
                gap: 1.5,
                py: 1.2,
                px: 2,
                borderRadius: 1,
                mx: 0.5,
                "&:hover": { background: "#f1f5f9" },
              },
            },
          }}
          transformOrigin={{ horizontal: "left", vertical: "bottom" }}
          anchorOrigin={{ horizontal: "left", vertical: "top" }}
        >
          {/* User info header */}
          <Box
            sx={{ px: 2, py: 1.5, borderBottom: "1px solid #f1f5f9", mb: 0.5 }}
          >
            <Typography
              sx={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}
            >
              {userName}
            </Typography>
            <Typography
              sx={{
                fontSize: 11,
                color: "#64748b",
                textTransform: "capitalize",
              }}
            >
              {userRole}
            </Typography>
          </Box>

          <MenuItem onClick={handleProfileClose}>
            <UserCircle size={16} color="#475569" />
            <Typography fontSize={14} color="#334155">
              Profile
            </Typography>
          </MenuItem>

          <MenuItem onClick={handleProfileClose}>
            <Settings size={16} color="#475569" />
            <Typography fontSize={14} color="#334155">
              Settings
            </Typography>
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />

          <MenuItem
            onClick={handleLogoutClick}
            sx={{ "&:hover": { background: "#fef2f2 !important" } }}
          >
            <LogOut size={16} color="#ef4444" />
            <Typography fontSize={14} color="#ef4444" fontWeight={500}>
              Logout
            </Typography>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

//  AppLayout Inner
const AppLayoutInner = () => {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // ── Auth Guard ──
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;

  const sidebarWidth = desktopCollapsed
    ? SIDEBAR_COLLAPSED_WIDTH
    : SIDEBAR_WIDTH;

  // ── Page title from path ──
  // const pageTitle =
  //   navItems.find((item) =>
  //     item.path === "/"
  //       ? location.pathname === "/"
  //       : location.pathname.startsWith(item.path),
  //   )?.label || "Dashboard";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    navigate("/login");
  };

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ── Desktop Sidebar ── */}
      {!isMobile && (
        <Box
          component="aside"
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            transition: "width 0.25s ease",
            overflow: "hidden",
          }}
        >
          <SidebarContent
            collapsed={desktopCollapsed}
            onToggle={() => setDesktopCollapsed((p) => !p)}
            onLogout={handleLogout}
            isMobile={false}
          />
        </Box>
      )}

      {/* ── Mobile Drawer ── */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              width: SIDEBAR_WIDTH,
              border: "none",
              background: "transparent",
            },
          }}
        >
          <SidebarContent
            collapsed={false}
            onClose={() => setMobileOpen(false)}
            onLogout={handleLogout}
            isMobile={true}
          />
        </Drawer>
      )}

      {/* ── Main Content Area ── */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* ── Top AppBar ── */}
        <AppBar
          position="static"
          color="inherit"
          elevation={0}
          sx={{
            borderBottom: "1px solid #e2e8f0",
            background: "#fff",
            flexShrink: 0,
          }}
        >
          <Toolbar
            sx={{
              gap: 1,
              minHeight: { xs: 56, sm: 64 },
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {isMobile ? (
                <IconButton
                  edge="start"
                  onClick={() => setMobileOpen(true)}
                  sx={{ color: "#475569" }}
                >
                  <MenuIcon size={22} />
                </IconButton>
              ) : (
                desktopCollapsed && (
                  <IconButton
                    edge="start"
                    onClick={() => setDesktopCollapsed(false)}
                    sx={{ color: "#475569" }}
                  >
                    <PanelLeftOpen size={22} />
                  </IconButton>
                )
              )}

              {/* Page Title */}
              <Typography
                variant="h6"
                sx={{
                  fontSize: { xs: 16, sm: 18 },
                  fontWeight: 700,
                  color: "#0f172a",
                  ml: 0.5,
                }}
              >
                {/* {pageTitle} */}
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>

        {/* ── Page Content ── */}
        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: "auto",
            p: { xs: 2, sm: 3 },
            background: "#f1f5f9",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

//  AppLayout
const AppLayout = () => (
  <ThemeProvider theme={appTheme}>
    <CssBaseline />
    <AppLayoutInner />
  </ThemeProvider>
);

export default AppLayout;
