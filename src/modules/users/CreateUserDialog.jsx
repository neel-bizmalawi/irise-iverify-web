import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  Grid,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormHelperText,
  Box,
  Typography,
  Zoom,
  useTheme,
  useMediaQuery,
  FormControl,
  InputBase,
  CircularProgress,
  IconButton,
  Select,
  MenuItem,
} from "@mui/material";
import { useFormik } from "formik";
import * as Yup from "yup";

// Icons
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import ToggleOnOutlinedIcon from "@mui/icons-material/ToggleOnOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";

import SearchableCreatableSelect from "../../components/SearchableCreatableSelect";

// ── Timezone list ──────────────────────────────────────────────────────────────
const TIMEZONE_OPTIONS = [
  { label: "UTC", value: "UTC" },

  // // 🇿🇦 Africa (your main region)
  // { label: "South Africa", value: "Africa/Johannesburg" },
  // { label: "Nigeria", value: "Africa/Lagos" },
  // { label: "Kenya", value: "Africa/Nairobi" },

  // // 🌏 Asia
  // { label: "India", value: "Asia/Kolkata" },
  // { label: "UAE", value: "Asia/Dubai" },
  // { label: "Singapore", value: "Asia/Singapore" },

  // // 🇪🇺 Europe
  // { label: "UK", value: "Europe/London" },

  // // 🇺🇸 USA
  // { label: "USA (New York)", value: "America/New_York" },
  // { label: "USA (Los Angeles)", value: "America/Los_Angeles" },

  // // 🌏 Oceania
  // { label: "Australia", value: "Australia/Sydney" },

  { label: "South Africa", value: "Africa/Johannesburg" },
  { label: "Nigeria", value: "Africa/Lagos" },
  { label: "Kenya", value: "Africa/Nairobi" },
  { label: "India", value: "Asia/Kolkata" },
  { label: "UK", value: "Europe/London" },
];

const getFlag = (country) => {
  const flags = {
    UTC: "🌐",
    "South Africa": "🇿🇦",
    Nigeria: "🇳🇬",
    Kenya: "🇰🇪",
    India: "🇮🇳",
    UK: "🇬🇧",
  };
  return flags[country] || "🌍";
};

// ── Initial Values ─────────────────────────────────────────────────────────────

const initialValues = {
  name: "",
  userName: "",
  email: "",
  password: "",
  contactNo: "",
  role: "",
  status: "active",
  timezone: "",
};

// ── Validation Schema ──────────────────────────────────────────────────────────
const getValidationSchema = (isEdit) =>
  Yup.object({
    name: Yup.string()
      .matches(/^[A-Za-z\s]+$/, "Only letters are allowed")
      .required("Full name is required"),
    userName: Yup.string()
      .min(3, "Minimum 3 characters")
      .required("Username is required"),
    email: Yup.string()
      .email("Invalid email address")
      .required("Email is required"),
    password: isEdit
      ? Yup.string().notRequired()
      : Yup.string()
          .min(6, "Minimum 6 characters")
          .required("Password is required"),
    contactNo: Yup.string()
      .matches(/^[0-9]{6,15}$/, "Enter a valid 6-15 digit mobile number")
      .required("Mobile number is required"),
    role: Yup.string().required("User role is required"),
    status: Yup.string().oneOf(["active", "inactive"]).required(),
    timezone: Yup.string().required("Timezone is required"),
  });

// ── Field Label ────────────────────────────────────────────────────────────────
const FieldLabel = ({ icon: Icon, label, required }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
    {Icon && <Icon sx={{ fontSize: 15, color: "#6b7280" }} />}
    <Typography
      variant="caption"
      sx={{
        fontWeight: 600,
        color: "#374151",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        fontSize: "0.68rem",
      }}
    >
      {label}
      {required && (
        <Box component="span" sx={{ color: "#ef4444", ml: 0.3 }}>
          *
        </Box>
      )}
    </Typography>
  </Box>
);

// ── Styled Input ───────────────────────────────────────────────────────────────
const StyledInput = ({
  value,
  onChange,
  onBlur,
  type = "text",
  placeholder,
  error,
  endAdornment,
}) => (
  <InputBase
    type={type}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    placeholder={placeholder}
    endAdornment={endAdornment}
    sx={{
      width: "220px",
      border: `1.5px solid ${error ? "#ef4444" : "#e5e7eb"}`,
      borderRadius: "10px",
      px: 1.75,
      py: 1.1,
      fontSize: "0.88rem",
      color: "#111827",
      background: "#ffffff",
      transition: "all 0.2s ease",
      "& input": {
        "&::placeholder": { color: "#b0b7c3", fontSize: "0.85rem" },
      },
      "&:hover": {
        borderColor: error ? "#ef4444" : "#9ca3af",
        background: "#fafafa",
      },
      "&.Mui-focused": {
        borderColor: error ? "#ef4444" : "#16a34a",
        background: "#fff",
        boxShadow: error
          ? "0 0 0 3px rgba(239, 68, 68, 0.1)"
          : "0 0 0 3px rgba(22, 163, 74, 0.1)",
      },
    }}
  />
);

// ── Main Component ─────────────────────────────────────────────────────────────
const CreateUserDialog = ({
  open,
  onClose,
  onSubmit,
  initialData,
  roleOptions = [],
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isEdit = Boolean(initialData);

  // ── Formik ─────────────────────────────────────────────────────────────────
  const formik = useFormik({
    initialValues: initialData
      ? { ...initialValues, ...initialData }
      : initialValues,
    validationSchema: getValidationSchema(isEdit),
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        await onSubmit?.(values);
        resetForm();
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Reset on close
  useEffect(() => {
    if (!open) {
      formik.resetForm();
      setShowPassword(false);
    }
  }, [open]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      fullScreen={isMobile}
      scroll="paper"
      TransitionComponent={Zoom}
      TransitionProps={{ timeout: 280 }}
      PaperProps={{
        elevation: 0,
        sx: {
          width: "780px",
          borderRadius: isMobile ? 0 : "20px",
          background: "#f8fafc",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
          boxShadow:
            "0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
        },
      }}
      BackdropProps={{
        sx: {
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(4px)",
        },
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          background:
            "linear-gradient(135deg, #166534 0%, #16a34a 60%, #4ade80 100%)",
          px: 4,
          pt: 3.5,
          pb: 3,
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -20,
            right: 80,
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
          }}
        />
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: "#ffffff",
            fontSize: "1.2rem",
            letterSpacing: "-0.01em",
          }}
        >
          {isEdit ? "Update User" : "Create User"}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "rgba(255,255,255,0.7)", mt: 0.25, fontSize: "0.8rem" }}
        >
          {isEdit
            ? "Modify the details of this user below."
            : "Fill in the details to register a new user."}
        </Typography>
      </Box>

      {/* ── Form Body ── */}
      <DialogContent
        sx={{ px: { xs: 2.5, sm: 4 }, py: 3.5, background: "#f8fafc" }}
      >
        <Grid
          container
          spacing={2.5}
          justifyContent="start"
          alignItems="stretch"
        >
          {/* Full Name */}
          <Grid item xs={12} sm={5}>
            <FormControl
              fullWidth
              error={formik.touched.name && Boolean(formik.errors.name)}
            >
              <FieldLabel
                icon={PersonOutlineOutlinedIcon}
                label="Full Name"
                required
              />
              <StyledInput
                value={formik.values.name}
                onChange={formik.handleChange("name")}
                onBlur={formik.handleBlur("name")}
                placeholder="e.g. John Doe"
                error={formik.touched.name && Boolean(formik.errors.name)}
              />
              {formik.touched.name && formik.errors.name && (
                <FormHelperText>{formik.errors.name}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* User Name */}
          <Grid item xs={12} sm={5}>
            <FormControl
              fullWidth
              error={formik.touched.userName && Boolean(formik.errors.userName)}
            >
              <FieldLabel
                icon={PersonOutlineOutlinedIcon}
                label="User Name"
                required
              />
              <StyledInput
                value={formik.values.userName}
                onChange={formik.handleChange("userName")}
                onBlur={formik.handleBlur("userName")}
                placeholder="e.g. johndoe"
                error={
                  formik.touched.userName && Boolean(formik.errors.userName)
                }
              />
              {formik.touched.userName && formik.errors.userName && (
                <FormHelperText>{formik.errors.userName}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* Email */}
          <Grid item xs={12} sm={5}>
            <FormControl
              fullWidth
              error={formik.touched.email && Boolean(formik.errors.email)}
            >
              <FieldLabel icon={EmailOutlinedIcon} label="Email" required />
              <StyledInput
                type="email"
                value={formik.values.email}
                onChange={formik.handleChange("email")}
                onBlur={formik.handleBlur("email")}
                placeholder="e.g. john@example.com"
                error={formik.touched.email && Boolean(formik.errors.email)}
              />
              {formik.touched.email && formik.errors.email && (
                <FormHelperText>{formik.errors.email}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* Password */}
          <Grid item xs={12} sm={5}>
            <FormControl
              fullWidth
              error={formik.touched.password && Boolean(formik.errors.password)}
            >
              <FieldLabel
                icon={LockOutlinedIcon}
                label="Password"
                required={!isEdit}
              />
              <StyledInput
                type={showPassword ? "text" : "password"}
                value={formik.values.password}
                onChange={formik.handleChange("password")}
                onBlur={formik.handleBlur("password")}
                placeholder={
                  isEdit ? "Leave blank to keep current" : "Min. 6 characters"
                }
                error={
                  formik.touched.password && Boolean(formik.errors.password)
                }
                endAdornment={
                  <IconButton
                    size="small"
                    onClick={() => setShowPassword((p) => !p)}
                    edge="end"
                    tabIndex={-1}
                    sx={{ mr: 0.25 }}
                  >
                    {showPassword ? (
                      <VisibilityOffOutlinedIcon
                        sx={{ fontSize: 18, color: "#9ca3af" }}
                      />
                    ) : (
                      <VisibilityOutlinedIcon
                        sx={{ fontSize: 18, color: "#9ca3af" }}
                      />
                    )}
                  </IconButton>
                }
              />
              {formik.touched.password && formik.errors.password && (
                <FormHelperText>{formik.errors.password}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* User Role */}
          <Grid item xs={12} sm={5}>
            <FormControl fullWidth>
              <FieldLabel
                icon={AdminPanelSettingsOutlinedIcon}
                label="User Role"
                required
              />
              <SearchableCreatableSelect
                label="Search Role"
                value={
                  roleOptions.find(
                    (r) => String(r.roleName) === String(formik.values.role),
                  ) || null
                }
                error={formik.touched.role && Boolean(formik.errors.role)}
                options={roleOptions}
                loading={false}
                labelKey="roleName"
                onSearch={() => {}}
                onChange={(val) => {
                  formik.setFieldValue(
                    "role",
                    val?.roleName ? String(val.roleName) : "",
                  );
                  formik.setFieldTouched("role", true, false);
                }}
                allowCreate={false}
                width="220px"
                height={46}
              />
              {formik.touched.role && formik.errors.role && (
                <FormHelperText error>{formik.errors.role}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* Contact Number */}
          <Grid item xs={12} sm={5}>
            <FormControl
              fullWidth
              error={
                formik.touched.contactNo && Boolean(formik.errors.contactNo)
              }
            >
              <FieldLabel
                icon={PhoneOutlinedIcon}
                label="Contact Number"
                required
              />
              <InputBase
                value={formik.values.contactNo}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 15);
                  formik.setFieldValue("contactNo", val);
                }}
                onBlur={formik.handleBlur("contactNo")}
                placeholder="e.g. 123456"
                inputProps={{ maxLength: 15, inputMode: "numeric" }}
                sx={{
                  border: `1.5px solid ${
                    formik.touched.contactNo && formik.errors.contactNo
                      ? "#ef4444"
                      : "#e5e7eb"
                  }`,
                  width: "220px",
                  borderRadius: "10px",
                  px: 1.75,
                  py: 1.1,
                  fontSize: "0.88rem",
                  color: "#111827",
                  background: "#ffffff",
                  transition: "all 0.2s ease",
                  "& input": {
                    "&::placeholder": { color: "#b0b7c3", fontSize: "0.85rem" },
                  },
                  "&:hover": {
                    borderColor:
                      formik.touched.contactNo && formik.errors.contactNo
                        ? "#ef4444"
                        : "#9ca3af",
                    background: "#fafafa",
                  },
                  "&.Mui-focused": {
                    borderColor:
                      formik.touched.contactNo && formik.errors.contactNo
                        ? "#ef4444"
                        : "#16a34a",
                    background: "#fff",
                    boxShadow:
                      formik.touched.contactNo && formik.errors.contactNo
                        ? "0 0 0 3px rgba(239,68,68,0.1)"
                        : "0 0 0 3px rgba(22,163,74,0.1)",
                  },
                }}
              />
              {formik.touched.contactNo && formik.errors.contactNo && (
                <FormHelperText error>{formik.errors.contactNo}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* ── Timezone ── */}
          <Grid item xs={12} sm={5}>
            <FormControl
              fullWidth
              error={formik.touched.timezone && Boolean(formik.errors.timezone)}
            >
              <FieldLabel icon={PublicOutlinedIcon} label="Timezone" required />

              <Select
                value={formik.values.timezone}
                onChange={(e) =>
                  formik.setFieldValue("timezone", e.target.value)
                }
                onBlur={formik.handleBlur("timezone")}
                displayEmpty
                // renderValue={(selected) => {
                //   if (!selected) {
                //     return (
                //       <span style={{ color: "#b0b7c3" }}>Select timezone</span>
                //     );
                //   }
                //   return TIMEZONE_OPTIONS.find((tz) => tz.value === selected)
                //     ?.label;
                // }}
                renderValue={(selected) => {
                  if (!selected) {
                    return (
                      <span style={{ color: "#b0b7c3" }}>Select timezone</span>
                    );
                  }

                  const selectedItem = TIMEZONE_OPTIONS.find(
                    (tz) => tz.value === selected,
                  );

                  return (
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span>{getFlag(selectedItem?.label)}</span>
                      {selectedItem?.label}
                    </span>
                  );
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 210,
                      overflowY: "auto",

                      // ✅ ADD THESE LINES
                      "&::-webkit-scrollbar": {
                        display: "none",
                      },
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",

                      borderRadius: "10px",
                      border: "1px solid #e5e7eb",
                      boxShadow:
                        "0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
                      mt: 0.5,
                    },
                  },
                }}
                sx={{
                  width: "220px",
                  height: "46px",
                  borderRadius: "10px",
                  fontSize: "0.88rem",
                  color: formik.values.timezone ? "#111827" : "#b0b7c3",
                  background: "#ffffff",
                  border: `1.5px solid ${
                    formik.touched.timezone && formik.errors.timezone
                      ? "#ef4444"
                      : "#e5e7eb"
                  }`,
                  transition: "all 0.2s ease",
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                  "&:hover": {
                    borderColor:
                      formik.touched.timezone && formik.errors.timezone
                        ? "#ef4444"
                        : "#9ca3af",
                    background: "#fafafa",
                  },
                  "&.Mui-focused": {
                    borderColor:
                      formik.touched.timezone && formik.errors.timezone
                        ? "#ef4444"
                        : "#16a34a",
                    background: "#fff",
                    boxShadow:
                      formik.touched.timezone && formik.errors.timezone
                        ? "0 0 0 3px rgba(239,68,68,0.1)"
                        : "0 0 0 3px rgba(22,163,74,0.1)",
                  },
                  "& .MuiSelect-select": {
                    py: 0,
                    display: "flex",
                    alignItems: "center",
                  },
                }}
              >
                {/* {TIMEZONE_OPTIONS.map((tz) => (
                  <MenuItem
                    key={tz.value}
                    value={tz.value}
                    sx={{ fontSize: "0.85rem", color: "#111827" }}
                  >
                    {tz.label}
                  </MenuItem>
                ))} */}
                {TIMEZONE_OPTIONS.map((tz) => (
                  <MenuItem
                    key={tz.value}
                    value={tz.value}
                    sx={{ fontSize: "0.85rem", color: "#111827" }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <span>{getFlag(tz.label)}</span>
                      {tz.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>

              {formik.touched.timezone && formik.errors.timezone && (
                <FormHelperText error>{formik.errors.timezone}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* Status */}
          <Grid item xs={12} sm={5}>
            <FieldLabel icon={ToggleOnOutlinedIcon} label="Status" required />
            <Box
              sx={{
                border: "1.5px solid #e5e7eb",
                borderRadius: "10px",
                px: 1.75,
                py: 1.1,
                background: "#ffffff",
                minHeight: 46,
                display: "flex",
                alignItems: "center",
                width: "220px",
              }}
            >
              <RadioGroup
                row
                value={formik.values.status}
                onChange={(e) => formik.setFieldValue("status", e.target.value)}
                sx={{ gap: 1 }}
              >
                {[
                  { value: "active", label: "Active", color: "#16a34a" },
                  { value: "inactive", label: "In Active", color: "#ef4444" },
                ].map((opt) => (
                  <FormControlLabel
                    key={opt.value}
                    value={opt.value}
                    control={
                      <Radio
                        size="small"
                        sx={{
                          color: "#d1d5db",
                          "&.Mui-checked": { color: opt.color },
                          p: 0.5,
                        }}
                      />
                    }
                    label={
                      <Typography
                        sx={{
                          fontSize: "0.86rem",
                          fontWeight: 500,
                          color:
                            formik.values.status === opt.value
                              ? opt.color
                              : "#6b7280",
                        }}
                      >
                        {opt.label}
                      </Typography>
                    }
                    sx={{ mr: 1, ml: 0 }}
                  />
                ))}
              </RadioGroup>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      {/* ── Footer ── */}
      <Box
        sx={{
          px: { xs: 2.5, sm: 4 },
          py: 2.5,
          background: "#fff",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "flex-end",
          gap: 1.5,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <Button
          onClick={onClose}
          disabled={formik.isSubmitting}
          sx={{
            color: "#6b7280",
            fontWeight: 500,
            fontSize: "0.85rem",
            borderRadius: "9px",
            px: 3,
            py: 1,
            textTransform: "none",
            border: "1.5px solid #e5e7eb",
            "&:hover": { background: "#f9fafb", borderColor: "#d1d5db" },
          }}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={formik.handleSubmit}
          disabled={formik.isSubmitting}
          disableElevation
          startIcon={
            formik.isSubmitting ? (
              <CircularProgress
                size={14}
                sx={{ color: "rgba(255,255,255,0.7)" }}
              />
            ) : null
          }
          sx={{
            background: "linear-gradient(135deg, #166534, #16a34a)",
            borderRadius: "9px",
            px: 3.5,
            py: 1,
            fontWeight: 600,
            fontSize: "0.85rem",
            textTransform: "none",
            letterSpacing: "0.01em",
            color: "#fff",
            transition: "all 0.2s ease",
            "&:hover": {
              background: "linear-gradient(135deg, #14532d, #15803d)",
              transform: "translateY(-1px)",
              boxShadow: "0 4px 12px rgba(22, 163, 74, 0.35)",
            },
            "&:active": { transform: "translateY(0)" },
            "&.Mui-disabled": { background: "#d1d5db", color: "#9ca3af" },
          }}
        >
          {formik.isSubmitting ? "Saving..." : isEdit ? "Update" : "Create"}
        </Button>
      </Box>
    </Dialog>
  );
};

export default CreateUserDialog;

// import React, { useEffect, useState } from "react";
// import {
//   Dialog,
//   DialogContent,
//   Grid,
//   Button,
//   Radio,
//   RadioGroup,
//   FormControlLabel,
//   FormHelperText,
//   Box,
//   Typography,
//   Zoom,
//   useTheme,
//   useMediaQuery,
//   FormControl,
//   InputBase,
//   CircularProgress,
//   IconButton,
// } from "@mui/material";
// import { useFormik } from "formik";
// import * as Yup from "yup";

// // Icons
// import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
// import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
// import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
// import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
// import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
// import ToggleOnOutlinedIcon from "@mui/icons-material/ToggleOnOutlined";
// import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
// import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";

// import SearchableCreatableSelect from "../../components/SearchableCreatableSelect";

// // ── Initial Values ─────────────────────────────────────────────────────────────
// const initialValues = {
//   name: "",
//   userName: "",
//   email: "",
//   password: "",
//   contactNo: "",
//   role: "",
//   status: "active",
// };

// // ── Validation Schema ──────────────────────────────────────────────────────────
// const getValidationSchema = (isEdit) =>
//   Yup.object({
//     name: Yup.string()
//       .matches(/^[A-Za-z\s]+$/, "Only letters are allowed")
//       .required("Full name is required"),
//     userName: Yup.string()
//       .min(3, "Minimum 3 characters")
//       .required("Username is required"),
//     email: Yup.string()
//       .email("Invalid email address")
//       .required("Email is required"),
//     password: isEdit
//       ? Yup.string().notRequired()
//       : Yup.string()
//           .min(6, "Minimum 6 characters")
//           .required("Password is required"),
//     contactNo: Yup.string()
//       .matches(/^[0-9]{6,15}$/, "Enter a valid 6-15 digit mobile number")
//       .required("Mobile number is required"),
//     role: Yup.string().required("User role is required"),
//     status: Yup.string().oneOf(["active", "inactive"]).required(),
//   });

// // ── Field Label ────────────────────────────────────────────────────────────────
// const FieldLabel = ({ icon: Icon, label, required }) => (
//   <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
//     {Icon && <Icon sx={{ fontSize: 15, color: "#6b7280" }} />}
//     <Typography
//       variant="caption"
//       sx={{
//         fontWeight: 600,
//         color: "#374151",
//         letterSpacing: "0.04em",
//         textTransform: "uppercase",
//         fontSize: "0.68rem",
//       }}
//     >
//       {label}
//       {required && (
//         <Box component="span" sx={{ color: "#ef4444", ml: 0.3 }}>
//           *
//         </Box>
//       )}
//     </Typography>
//   </Box>
// );

// // ── Styled Input ───────────────────────────────────────────────────────────────
// const StyledInput = ({
//   value,
//   onChange,
//   onBlur,
//   type = "text",
//   placeholder,
//   error,
//   endAdornment,
// }) => (
//   <InputBase
//     type={type}
//     value={value}
//     onChange={onChange}
//     onBlur={onBlur}
//     placeholder={placeholder}
//     endAdornment={endAdornment}
//     sx={{
//       width: "220px",
//       border: `1.5px solid ${error ? "#ef4444" : "#e5e7eb"}`,
//       borderRadius: "10px",
//       px: 1.75,
//       py: 1.1,
//       fontSize: "0.88rem",
//       color: "#111827",
//       background: "#ffffff",
//       transition: "all 0.2s ease",
//       "& input": {
//         "&::placeholder": { color: "#b0b7c3", fontSize: "0.85rem" },
//       },
//       "&:hover": {
//         borderColor: error ? "#ef4444" : "#9ca3af",
//         background: "#fafafa",
//       },
//       "&.Mui-focused": {
//         borderColor: error ? "#ef4444" : "#16a34a",
//         background: "#fff",
//         boxShadow: error
//           ? "0 0 0 3px rgba(239, 68, 68, 0.1)"
//           : "0 0 0 3px rgba(22, 163, 74, 0.1)",
//       },
//     }}
//   />
// );

// // ── Main Component ─────────────────────────────────────────────────────────────
// // roleOptions is fetched once in Users.jsx and passed down — no API call here
// const CreateUserDialog = ({
//   open,
//   onClose,
//   onSubmit,
//   initialData,
//   roleOptions = [],
// }) => {
//   const [showPassword, setShowPassword] = useState(false);

//   const theme = useTheme();
//   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
//   const isEdit = Boolean(initialData);

//   // ── Formik ─────────────────────────────────────────────────────────────────
//   const formik = useFormik({
//     initialValues: initialData
//       ? { ...initialValues, ...initialData }
//       : initialValues,
//     validationSchema: getValidationSchema(isEdit),
//     enableReinitialize: true,
//     onSubmit: async (values, { setSubmitting, resetForm }) => {
//       try {
//         await onSubmit?.(values);
//         resetForm();
//       } finally {
//         setSubmitting(false);
//       }
//     },
//   });

//   // Reset on close
//   useEffect(() => {
//     if (!open) {
//       formik.resetForm();
//       setShowPassword(false);
//     }
//   }, [open]);

//   // ── Render ──────────────────────────────────────────────────────────────────
//   return (
//     <Dialog
//       open={open}
//       onClose={onClose}
//       maxWidth={false}
//       fullWidth
//       fullScreen={isMobile}
//       scroll="paper"
//       TransitionComponent={Zoom}
//       TransitionProps={{ timeout: 280 }}
//       PaperProps={{
//         elevation: 0,
//         sx: {
//           width: "780px",
//           borderRadius: isMobile ? 0 : "20px",
//           background: "#f8fafc",
//           border: "1px solid #e5e7eb",
//           overflow: "hidden",
//           boxShadow:
//             "0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
//         },
//       }}
//       BackdropProps={{
//         sx: {
//           background: "rgba(15, 23, 42, 0.4)",
//           backdropFilter: "blur(4px)",
//         },
//       }}
//     >
//       {/* ── Header ── */}
//       <Box
//         sx={{
//           background:
//             "linear-gradient(135deg, #166534 0%, #16a34a 60%, #4ade80 100%)",
//           px: 4,
//           pt: 3.5,
//           pb: 3,
//           position: "relative",
//           overflow: "hidden",
//           flexShrink: 0,
//         }}
//       >
//         <Box
//           sx={{
//             position: "absolute",
//             top: -40,
//             right: -40,
//             width: 160,
//             height: 160,
//             borderRadius: "50%",
//             background: "rgba(255,255,255,0.06)",
//           }}
//         />
//         <Box
//           sx={{
//             position: "absolute",
//             bottom: -20,
//             right: 80,
//             width: 80,
//             height: 80,
//             borderRadius: "50%",
//             background: "rgba(255,255,255,0.04)",
//           }}
//         />
//         <Typography
//           variant="h6"
//           sx={{
//             fontWeight: 700,
//             color: "#ffffff",
//             fontSize: "1.2rem",
//             letterSpacing: "-0.01em",
//           }}
//         >
//           {isEdit ? "Update User" : "Create User"}
//         </Typography>
//         <Typography
//           variant="body2"
//           sx={{ color: "rgba(255,255,255,0.7)", mt: 0.25, fontSize: "0.8rem" }}
//         >
//           {isEdit
//             ? "Modify the details of this user below."
//             : "Fill in the details to register a new user."}
//         </Typography>
//       </Box>

//       {/* ── Form Body ── */}
//       <DialogContent
//         sx={{ px: { xs: 2.5, sm: 4 }, py: 3.5, background: "#f8fafc" }}
//       >
//         <Grid
//           container
//           spacing={2.5}
//           justifyContent="start"
//           alignItems="stretch"
//         >
//           {/* Row 1 — Full Name | User Name | Email */}
//           <Grid item xs={12} sm={5}>
//             <FormControl
//               fullWidth
//               error={formik.touched.name && Boolean(formik.errors.name)}
//             >
//               <FieldLabel
//                 icon={PersonOutlineOutlinedIcon}
//                 label="Full Name"
//                 required
//               />
//               <StyledInput
//                 value={formik.values.name}
//                 onChange={formik.handleChange("name")}
//                 onBlur={formik.handleBlur("name")}
//                 placeholder="e.g. John Doe"
//                 error={formik.touched.name && Boolean(formik.errors.name)}
//               />
//               {formik.touched.name && formik.errors.name && (
//                 <FormHelperText>{formik.errors.name}</FormHelperText>
//               )}
//             </FormControl>
//           </Grid>

//           <Grid item xs={12} sm={5}>
//             <FormControl
//               fullWidth
//               error={formik.touched.userName && Boolean(formik.errors.userName)}
//             >
//               <FieldLabel
//                 icon={PersonOutlineOutlinedIcon}
//                 label="User Name"
//                 required
//               />
//               <StyledInput
//                 value={formik.values.userName}
//                 onChange={formik.handleChange("userName")}
//                 onBlur={formik.handleBlur("userName")}
//                 placeholder="e.g. johndoe"
//                 error={
//                   formik.touched.userName && Boolean(formik.errors.userName)
//                 }
//               />
//               {formik.touched.userName && formik.errors.userName && (
//                 <FormHelperText>{formik.errors.userName}</FormHelperText>
//               )}
//             </FormControl>
//           </Grid>

//           <Grid item xs={12} sm={5}>
//             <FormControl
//               fullWidth
//               error={formik.touched.email && Boolean(formik.errors.email)}
//             >
//               <FieldLabel icon={EmailOutlinedIcon} label="Email" required />
//               <StyledInput
//                 type="email"
//                 value={formik.values.email}
//                 onChange={formik.handleChange("email")}
//                 onBlur={formik.handleBlur("email")}
//                 placeholder="e.g. john@example.com"
//                 error={formik.touched.email && Boolean(formik.errors.email)}
//               />
//               {formik.touched.email && formik.errors.email && (
//                 <FormHelperText>{formik.errors.email}</FormHelperText>
//               )}
//             </FormControl>
//           </Grid>

//           {/* Row 2 — Password | Mobile Number | User Role */}
//           {/* {!isEdit && (
//             <Grid item xs={12} sm={4}>
//               <FormControl
//                 fullWidth
//                 error={
//                   formik.touched.password && Boolean(formik.errors.password)
//                 }
//               >
//                 <FieldLabel
//                   icon={LockOutlinedIcon}
//                   label="Password"
//                   required={!isEdit}
//                 />
//                 <StyledInput
//                   type={showPassword ? "text" : "password"}
//                   value={formik.values.password}
//                   onChange={formik.handleChange("password")}
//                   onBlur={formik.handleBlur("password")}
//                   placeholder={
//                     isEdit ? "Leave blank to keep current" : "Min. 6 characters"
//                   }
//                   error={
//                     formik.touched.password && Boolean(formik.errors.password)
//                   }
//                   endAdornment={
//                     <IconButton
//                       size="small"
//                       onClick={() => setShowPassword((p) => !p)}
//                       edge="end"
//                       tabIndex={-1}
//                       sx={{ mr: 0.25 }}
//                     >
//                       {showPassword ? (
//                         <VisibilityOffOutlinedIcon
//                           sx={{ fontSize: 18, color: "#9ca3af" }}
//                         />
//                       ) : (
//                         <VisibilityOutlinedIcon
//                           sx={{ fontSize: 18, color: "#9ca3af" }}
//                         />
//                       )}
//                     </IconButton>
//                   }
//                 />
//                 {formik.touched.password && formik.errors.password && (
//                   <FormHelperText>{formik.errors.password}</FormHelperText>
//                 )}
//               </FormControl>
//             </Grid>
//           )} */}
//           <Grid item xs={12} sm={5}>
//             <FormControl
//               fullWidth
//               error={formik.touched.password && Boolean(formik.errors.password)}
//             >
//               <FieldLabel
//                 icon={LockOutlinedIcon}
//                 label="Password"
//                 required={!isEdit}
//               />
//               <StyledInput
//                 type={showPassword ? "text" : "password"}
//                 value={formik.values.password}
//                 onChange={formik.handleChange("password")}
//                 onBlur={formik.handleBlur("password")}
//                 placeholder={
//                   isEdit ? "Leave blank to keep current" : "Min. 6 characters"
//                 }
//                 error={
//                   formik.touched.password && Boolean(formik.errors.password)
//                 }
//                 endAdornment={
//                   <IconButton
//                     size="small"
//                     onClick={() => setShowPassword((p) => !p)}
//                     edge="end"
//                     tabIndex={-1}
//                     sx={{ mr: 0.25 }}
//                   >
//                     {showPassword ? (
//                       <VisibilityOffOutlinedIcon
//                         sx={{ fontSize: 18, color: "#9ca3af" }}
//                       />
//                     ) : (
//                       <VisibilityOutlinedIcon
//                         sx={{ fontSize: 18, color: "#9ca3af" }}
//                       />
//                     )}
//                   </IconButton>
//                 }
//               />
//               {formik.touched.password && formik.errors.password && (
//                 <FormHelperText>{formik.errors.password}</FormHelperText>
//               )}
//             </FormControl>
//           </Grid>

//           <Grid item xs={12} sm={5}>
//             <FormControl fullWidth>
//               <FieldLabel
//                 icon={AdminPanelSettingsOutlinedIcon}
//                 label="User Role"
//                 required
//               />
//               {/*
//                 SearchableCreatableSelect — same component used by TrainingSites.
//                 roleOptions are passed from Users.jsx (already fetched & normalised).
//                 allowCreate=false so users can only pick existing roles.
//               */}
//               <SearchableCreatableSelect
//                 label="Search Role"
//                 value={
//                   roleOptions.find(
//                     (r) => String(r.roleName) === String(formik.values.role),
//                   ) || null
//                 }
//                 error={formik.touched.role && Boolean(formik.errors.role)}
//                 options={roleOptions}
//                 loading={false}
//                 labelKey="roleName"
//                 onSearch={() => {}}
//                 onChange={(val) => {
//                   formik.setFieldValue(
//                     "role",
//                     val?.roleName ? String(val.roleName) : "",
//                   );
//                   formik.setFieldTouched("role", true, false);
//                 }}
//                 allowCreate={false}
//                 width="220px"
//                 height={46}
//               />
//               {formik.touched.role && formik.errors.role && (
//                 <FormHelperText error>{formik.errors.role}</FormHelperText>
//               )}
//             </FormControl>
//           </Grid>

//           <Grid item xs={12} sm={5}>
//             <FormControl
//               fullWidth
//               error={
//                 formik.touched.contactNo && Boolean(formik.errors.contactNo)
//               }
//             >
//               <FieldLabel
//                 icon={PhoneOutlinedIcon}
//                 label="Contact Number"
//                 required
//               />
//               {/* Phone input with +91 prefix, digits only, max 10 */}
//               <InputBase
//                 value={formik.values.contactNo}
//                 onChange={(e) => {
//                   const val = e.target.value.replace(/\D/g, "").slice(0, 15);
//                   formik.setFieldValue("contactNo", val);
//                 }}
//                 onBlur={formik.handleBlur("contactNo")}
//                 placeholder="e.g. 123456"
//                 inputProps={{ maxLength: 15, inputMode: "numeric" }}
//                 sx={{
//                   border: `1.5px solid ${
//                     formik.touched.contactNo && formik.errors.contactNo
//                       ? "#ef4444"
//                       : "#e5e7eb"
//                   }`,
//                   width: "220px",
//                   borderRadius: "10px",
//                   px: 1.75,
//                   py: 1.1,
//                   fontSize: "0.88rem",
//                   color: "#111827",
//                   background: "#ffffff",
//                   transition: "all 0.2s ease",
//                   "& input": {
//                     "&::placeholder": { color: "#b0b7c3", fontSize: "0.85rem" },
//                   },
//                   "&:hover": {
//                     borderColor:
//                       formik.touched.contactNo && formik.errors.contactNo
//                         ? "#ef4444"
//                         : "#9ca3af",
//                     background: "#fafafa",
//                   },
//                   "&.Mui-focused": {
//                     borderColor:
//                       formik.touched.contactNo && formik.errors.contactNo
//                         ? "#ef4444"
//                         : "#16a34a",
//                     background: "#fff",
//                     boxShadow:
//                       formik.touched.contactNo && formik.errors.contactNo
//                         ? "0 0 0 3px rgba(239,68,68,0.1)"
//                         : "0 0 0 3px rgba(22,163,74,0.1)",
//                   },
//                 }}
//               />
//               {formik.touched.contactNo && formik.errors.contactNo && (
//                 <FormHelperText error>{formik.errors.contactNo}</FormHelperText>
//               )}
//             </FormControl>
//           </Grid>

//           {/* Row 3 — Status */}
//           <Grid item xs={12} sm={5}>
//             <FieldLabel icon={ToggleOnOutlinedIcon} label="Status" required />
//             <Box
//               sx={{
//                 border: "1.5px solid #e5e7eb",
//                 borderRadius: "10px",
//                 px: 1.75,
//                 py: 1.1,
//                 background: "#ffffff",
//                 minHeight: 46,
//                 display: "flex",
//                 alignItems: "center",
//                 width: "220px",
//               }}
//             >
//               <RadioGroup
//                 row
//                 value={formik.values.status}
//                 onChange={(e) => formik.setFieldValue("status", e.target.value)}
//                 sx={{ gap: 1 }}
//               >
//                 {[
//                   { value: "active", label: "Active", color: "#16a34a" },
//                   { value: "inactive", label: "In Active", color: "#ef4444" },
//                 ].map((opt) => (
//                   <FormControlLabel
//                     key={opt.value}
//                     value={opt.value}
//                     control={
//                       <Radio
//                         size="small"
//                         sx={{
//                           color: "#d1d5db",
//                           "&.Mui-checked": { color: opt.color },
//                           p: 0.5,
//                         }}
//                       />
//                     }
//                     label={
//                       <Typography
//                         sx={{
//                           fontSize: "0.86rem",
//                           fontWeight: 500,
//                           color:
//                             formik.values.status === opt.value
//                               ? opt.color
//                               : "#6b7280",
//                         }}
//                       >
//                         {opt.label}
//                       </Typography>
//                     }
//                     sx={{ mr: 1, ml: 0 }}
//                   />
//                 ))}
//               </RadioGroup>
//             </Box>
//           </Grid>
//         </Grid>
//       </DialogContent>

//       {/* ── Footer ── */}
//       <Box
//         sx={{
//           px: { xs: 2.5, sm: 4 },
//           py: 2.5,
//           background: "#fff",
//           borderTop: "1px solid #f1f5f9",
//           display: "flex",
//           justifyContent: "flex-end",
//           gap: 1.5,
//           alignItems: "center",
//           flexShrink: 0,
//         }}
//       >
//         <Button
//           onClick={onClose}
//           disabled={formik.isSubmitting}
//           sx={{
//             color: "#6b7280",
//             fontWeight: 500,
//             fontSize: "0.85rem",
//             borderRadius: "9px",
//             px: 3,
//             py: 1,
//             textTransform: "none",
//             border: "1.5px solid #e5e7eb",
//             "&:hover": { background: "#f9fafb", borderColor: "#d1d5db" },
//           }}
//         >
//           Cancel
//         </Button>

//         {/* <Button
//           variant="outlined"
//           onClick={formik.handleReset}
//           color="error"
//           sx={{
//             borderRadius: "9px",
//             textTransform: "none",
//             fontWeight: 500,
//             fontSize: "0.85rem",
//             px: 3,
//             py: 1,
//           }}
//         >
//           Reset
//         </Button> */}

//         <Button
//           variant="contained"
//           onClick={formik.handleSubmit}
//           disabled={formik.isSubmitting}
//           disableElevation
//           startIcon={
//             formik.isSubmitting ? (
//               <CircularProgress
//                 size={14}
//                 sx={{ color: "rgba(255,255,255,0.7)" }}
//               />
//             ) : null
//           }
//           sx={{
//             background: "linear-gradient(135deg, #166534, #16a34a)",
//             borderRadius: "9px",
//             px: 3.5,
//             py: 1,
//             fontWeight: 600,
//             fontSize: "0.85rem",
//             textTransform: "none",
//             letterSpacing: "0.01em",
//             color: "#fff",
//             transition: "all 0.2s ease",
//             "&:hover": {
//               background: "linear-gradient(135deg, #14532d, #15803d)",
//               transform: "translateY(-1px)",
//               boxShadow: "0 4px 12px rgba(22, 163, 74, 0.35)",
//             },
//             "&:active": { transform: "translateY(0)" },
//             "&.Mui-disabled": { background: "#d1d5db", color: "#9ca3af" },
//           }}
//         >
//           {formik.isSubmitting ? "Saving..." : isEdit ? "Update" : "Create"}
//         </Button>
//       </Box>
//     </Dialog>
//   );
// };

// export default CreateUserDialog;

// //start the design
