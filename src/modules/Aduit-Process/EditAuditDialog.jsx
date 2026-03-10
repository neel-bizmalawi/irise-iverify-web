import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormHelperText,
  Box,
  Typography,
  MenuItem,
  Zoom,
  useTheme,
  useMediaQuery,
  FormControl,
  Select,
  InputBase,
  Tooltip,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { useFormik } from "formik";
import * as Yup from "yup";

import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LocalFireDepartmentOutlinedIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PaymentOutlinedIcon from "@mui/icons-material/PaymentOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import LocalGasStationOutlinedIcon from "@mui/icons-material/LocalGasStationOutlined";

const BASE_IMAGE_URL = "http://192.168.0.106:3000";

const initialValues = {
  household_name: "",
  national_id: "",
  phone_number: "",
  visit_date: "",
  females_below_18: "",
  females_above_18: "",
  males_below_18: "",
  males_above_18: "",
  has_cookstove_observe: "no",
  cooking_method_before: "",
  fuel_used_before: "",
  other_cooking_device_before: "no",
  payment_requested: "no",
  payment_requested_by: "",
  training_before_receiving: "no",
  rea_conset: "no",
  sign_consent: "no",
  delivered_condition: "no",
  delivered_cook_stove: "",
  where_received: "",
  where_trained: "",
  latitude: "",
  longitude: "",
  remarks: "",
  s_is_sync: "Y",
  photo_path_cook_stove: null,
  photo_path_cook_stove_area: null,
};

const validationSchema = Yup.object({
  household_name: Yup.string().required("Household name is required"),
  national_id: Yup.string().required("National ID is required"),
  phone_number: Yup.string()
    .matches(/^\+?[0-9]{6,15}$/, "Must be 6–15 digits")
    .required("Phone number is required"),
  has_cookstove_observe: Yup.string().oneOf(["yes", "no"]).required(),
  other_cooking_device_before: Yup.string().oneOf(["yes", "no"]).required(),
  payment_requested: Yup.string().oneOf(["yes", "no"]).required(),
  training_before_receiving: Yup.string().oneOf(["yes", "no"]).required(),
  rea_conset: Yup.string().oneOf(["yes", "no"]).required(),
  sign_consent: Yup.string().oneOf(["yes", "no"]).required(),
  delivered_condition: Yup.string().oneOf(["yes", "no"]).required(),
  females_below_18: Yup.number().typeError("Must be a number").min(0).required("Required"),
  females_above_18: Yup.number().typeError("Must be a number").min(0).required("Required"),
  males_below_18: Yup.number().typeError("Must be a number").min(0).required("Required"),
  males_above_18: Yup.number().typeError("Must be a number").min(0).required("Required"),
});

// ── Image Lightbox ────────────────────────────────────────────────────────────
const ImageLightbox = ({ src, onClose }) => {
  if (!src) return null;
  return (
    <Box
      onClick={onClose}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "zoom-out",
      }}
    >
      <Box
        component="img"
        src={src}
        onClick={(e) => e.stopPropagation()}
        sx={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          borderRadius: "12px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          objectFit: "contain",
        }}
      />
      <IconButton
        onClick={onClose}
        sx={{
          position: "fixed",
          top: 20,
          right: 20,
          background: "rgba(255,255,255,0.15)",
          color: "#fff",
          "&:hover": { background: "rgba(255,255,255,0.25)" },
        }}
      >
        <CloseIcon />
      </IconButton>
    </Box>
  );
};

// ── Image Upload Field ────────────────────────────────────────────────────────
const ImageUploadField = ({ label, icon: Icon, fieldKey, value, onChange, existingUrl }) => {
  const inputRef = useRef();
  const [preview, setPreview] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    setPreview(null);
    setImgError(false);
    setRemoved(false);
    if (inputRef.current) inputRef.current.value = "";
  }, [existingUrl]);

  const serverUrl =
    existingUrl && existingUrl !== "null" && existingUrl !== "-" && existingUrl !== null
      ? `${BASE_IMAGE_URL}/${existingUrl.replace(/^\//, "")}`
      : null;

  const displaySrc = preview || (!imgError && !removed ? serverUrl : null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
    onChange(file);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview(null);
    setImgError(false);
    setRemoved(true);
    onChange("REMOVED");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />
      <Box>
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
          </Typography>
        </Box>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {displaySrc ? (
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: 120,
              borderRadius: "10px",
              overflow: "hidden",
              border: "1.5px solid #e5e7eb",
              background: "#f8fafc",
              cursor: "pointer",
            }}
            onClick={() => setLightbox(displaySrc)}
          >
            <Box
              component="img"
              src={displaySrc}
              onError={() => setImgError(true)}
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                opacity: 0,
                transition: "opacity 0.2s",
                "&:hover": { opacity: 1 },
              }}
            >
              <IconButton
                size="small"
                sx={{ background: "rgba(255,255,255,0.9)", "&:hover": { background: "#fff" } }}
                onClick={(e) => { e.stopPropagation(); setLightbox(displaySrc); }}
              >
                <ZoomInIcon fontSize="small" sx={{ color: "#374151" }} />
              </IconButton>
              <IconButton
                size="small"
                sx={{ background: "rgba(255,255,255,0.9)", "&:hover": { background: "#fff" } }}
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              >
                <AddPhotoAlternateOutlinedIcon fontSize="small" sx={{ color: "#16a34a" }} />
              </IconButton>
              <IconButton
                size="small"
                sx={{ background: "rgba(255,255,255,0.9)", "&:hover": { background: "#fff" } }}
                onClick={handleRemove}
              >
                <CloseIcon fontSize="small" sx={{ color: "#ef4444" }} />
              </IconButton>
            </Box>
          </Box>
        ) : (
          <Box
            onClick={() => inputRef.current?.click()}
            sx={{
              width: "100%",
              height: 120,
              border: "1.5px dashed #d1d5db",
              borderRadius: "10px",
              background: "#fafafa",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              transition: "all 0.2s",
              "&:hover": { borderColor: "#16a34a", background: "#f0fdf4" },
            }}
          >
            <AddPhotoAlternateOutlinedIcon sx={{ color: "#9ca3af", fontSize: 28 }} />
            <Typography sx={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 500 }}>
              Click to upload
            </Typography>
          </Box>
        )}
      </Box>
    </>
  );
};

// ── Section Title ─────────────────────────────────────────────────────────────
const SectionTitle = ({ label }) => (
  <Box sx={{ borderBottom: "1.5px solid #dcfce7", pb: 0.5, mt: 1 }}>
    <Typography
      sx={{
        fontSize: "0.72rem",
        fontWeight: 700,
        color: "#16a34a",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {label}
    </Typography>
  </Box>
);

// ── Field Label ───────────────────────────────────────────────────────────────
const FieldLabel = ({ icon: Icon, label, required }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1, whiteSpace: "nowrap" }}>
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
        <Box component="span" sx={{ color: "#ef4444", ml: 0.3 }}>*</Box>
      )}
    </Typography>
  </Box>
);

// ── Styled Input ──────────────────────────────────────────────────────────────
const StyledInput = ({ value, onChange, onBlur, type = "text", placeholder, error, inputProps }) => (
  <InputBase
    type={type}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    placeholder={placeholder}
    fullWidth
    inputProps={inputProps}
    sx={{
      border: `1.5px solid ${error ? "#ef4444" : "#e5e7eb"}`,
      borderRadius: "10px",
      px: 1.75,
      py: 1.1,
      fontSize: "0.88rem",
      color: "#111827",
      background: "#ffffff",
      transition: "all 0.2s ease",
      "& input": { "&::placeholder": { color: "#b0b7c3", fontSize: "0.85rem" } },
      "&:hover": { borderColor: error ? "#ef4444" : "#9ca3af", background: "#fafafa" },
      "&.Mui-focused": {
        borderColor: error ? "#ef4444" : "#16a34a",
        background: "#fff",
        boxShadow: error
          ? "0 0 0 3px rgba(239,68,68,0.1)"
          : "0 0 0 3px rgba(22,163,74,0.1)",
      },
    }}
  />
);

// ── Styled Select ─────────────────────────────────────────────────────────────
const StyledSelect = ({ value, onChange, onBlur, error, children }) => (
  <Select
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    displayEmpty
    fullWidth
    variant="outlined"
    sx={{
      borderRadius: "10px",
      fontSize: "0.88rem",
      color: value ? "#111827" : "#b0b7c3",
      background: "#ffffff",
      height: 46,
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: error ? "#ef4444" : "#e5e7eb",
        borderWidth: "1.5px",
      },
      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: error ? "#ef4444" : "#9ca3af" },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: error ? "#ef4444" : "#16a34a",
        borderWidth: "1.5px",
        boxShadow: error
          ? "0 0 0 3px rgba(239,68,68,0.1)"
          : "0 0 0 3px rgba(22,163,74,0.1)",
      },
    }}
  >
    {children}
  </Select>
);

// ── Yes/No Field ──────────────────────────────────────────────────────────────
const YesNoField = ({ label, icon: Icon, value, onChange, tooltip }) => (
  <Box>
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
      </Typography>
      {tooltip && (
        <Tooltip
          title={tooltip}
          arrow
          placement="top"
          componentsProps={{
            tooltip: {
              sx: {
                bgcolor: "#1e293b",
                color: "#f1f5f9",
                fontSize: "0.75rem",
                fontWeight: 400,
                lineHeight: 1.5,
                borderRadius: "8px",
                px: 1.5,
                py: 1,
                maxWidth: 260,
                boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                "& .MuiTooltip-arrow": { color: "#1e293b" },
              },
            },
          }}
        >
          <InfoOutlinedIcon
            sx={{
              fontSize: 14,
              color: "#9ca3af",
              cursor: "help",
              flexShrink: 0,
              transition: "color 0.2s",
              "&:hover": { color: "#16a34a" },
            }}
          />
        </Tooltip>
      )}
    </Box>
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
      }}
    >
      <RadioGroup row value={value} onChange={(e) => onChange(e.target.value)} sx={{ gap: 1 }}>
        {["yes", "no"].map((opt) => (
          <FormControlLabel
            key={opt}
            value={opt}
            control={
              <Radio
                size="small"
                sx={{ color: "#d1d5db", "&.Mui-checked": { color: "#16a34a" }, p: 0.5 }}
              />
            }
            label={
              <Typography
                sx={{
                  fontSize: "0.86rem",
                  fontWeight: 500,
                  color: value === opt ? (opt === "yes" ? "#16a34a" : "#ef4444") : "#6b7280",
                }}
              >
                {opt === "yes" ? "Yes" : "No"}
              </Typography>
            }
            sx={{ mr: 1, ml: 0 }}
          />
        ))}
      </RadioGroup>
    </Box>
  </Box>
);

// ── Grid helper ───────────────────────────────────────────────────────────────
const Grid2 = ({ children, cols = 2, gap = 3 }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap,
      alignItems: "start",
    }}
  >
    {children}
  </Box>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Dialog
// ─────────────────────────────────────────────────────────────────────────────
const EditAuditDialog = ({ open, onClose, onSubmit, initialData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const blockNonPhone = (e) => {
    const isPlus =
      e.key === "+" &&
      e.target.selectionStart === 0 &&
      !e.target.value.includes("+");
    if (!/^[0-9]$/.test(e.key) && !isPlus && e.key.length === 1)
      e.preventDefault();
  };

  const formik = useFormik({
    initialValues: initialData ? { ...initialValues, ...initialData } : initialValues,
    validationSchema,
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

  useEffect(() => {
    if (!open) formik.resetForm();
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      scroll="paper"
      TransitionComponent={Zoom}
      TransitionProps={{ timeout: 280 }}
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: isMobile ? 0 : "20px",
          background: "#f8fafc",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
        },
      }}
      BackdropProps={{
        sx: { background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" },
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #166534 0%, #16a34a 60%, #4ade80 100%)",
          px: 4,
          pt: 3.5,
          pb: 3,
          minHeight: 105,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute", top: -40, right: -40,
            width: 160, height: 160, borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <Box
          sx={{
            position: "absolute", bottom: -20, right: 80,
            width: 80, height: 80, borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
          }}
        />
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, color: "#fff", fontSize: "1.2rem", letterSpacing: "-0.01em" }}
        >
          Update Audit Record
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "rgba(255,255,255,0.7)", mt: 0.25, fontSize: "0.8rem" }}
        >
          Modify the details of this audit process record below.
        </Typography>
      </Box>

      {/* ── Form Body ── */}
      <DialogContent sx={{ px: { xs: 2.5, sm: 4 }, py: 3, background: "#f8fafc" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

          {/* ── Household Information ── */}
          <SectionTitle label="Household Information" />
          <Grid2>
            <FormControl
              fullWidth
              error={formik.touched.household_name && Boolean(formik.errors.household_name)}
            >
              <FieldLabel icon={HomeOutlinedIcon} label="Household Name" required />
              <StyledInput
                value={formik.values.household_name}
                onChange={formik.handleChange("household_name")}
                onBlur={formik.handleBlur("household_name")}
                placeholder="e.g. Rohan Yadav"
                error={formik.touched.household_name && Boolean(formik.errors.household_name)}
              />
              {formik.touched.household_name && formik.errors.household_name && (
                <FormHelperText>{formik.errors.household_name}</FormHelperText>
              )}
            </FormControl>

            <FormControl
              fullWidth
              error={formik.touched.national_id && Boolean(formik.errors.national_id)}
            >
              <FieldLabel icon={BadgeOutlinedIcon} label="National ID" required />
              <StyledInput
                value={formik.values.national_id}
                onChange={(e) =>
                  formik.setFieldValue(
                    "national_id",
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                  )
                }
                onBlur={formik.handleBlur("national_id")}
                placeholder="e.g. AK3009"
                error={formik.touched.national_id && Boolean(formik.errors.national_id)}
              />
              {formik.touched.national_id && formik.errors.national_id && (
                <FormHelperText>{formik.errors.national_id}</FormHelperText>
              )}
            </FormControl>

            <FormControl
              fullWidth
              error={formik.touched.phone_number && Boolean(formik.errors.phone_number)}
            >
              <FieldLabel icon={PhoneOutlinedIcon} label="Phone Number" required />
              <StyledInput
                value={formik.values.phone_number}
                onChange={formik.handleChange("phone_number")}
                onBlur={formik.handleBlur("phone_number")}
                placeholder="+265 999 000 000"
                error={formik.touched.phone_number && Boolean(formik.errors.phone_number)}
                inputProps={{ onKeyDown: blockNonPhone, maxLength: 15 }}
              />
              {formik.touched.phone_number && formik.errors.phone_number && (
                <FormHelperText>{formik.errors.phone_number}</FormHelperText>
              )}
            </FormControl>

            <FormControl fullWidth>
              <FieldLabel icon={CalendarTodayOutlinedIcon} label="Visit Date" />
              <StyledInput
                type="date"
                value={formik.values.visit_date}
                onChange={formik.handleChange("visit_date")}
                onBlur={formik.handleBlur("visit_date")}
              />
            </FormControl>
          </Grid2>

          {/* ── Household Members ── */}
          <SectionTitle label="Household Members" />
          <Grid2 cols={4}>
            {[
              { field: "females_below_18", label: "Females -18" },
              { field: "females_above_18", label: "Females +18" },
              { field: "males_below_18", label: "Males -18" },
              { field: "males_above_18", label: "Males +18" },
            ].map(({ field, label }) => (
              <FormControl
                key={field}
                fullWidth
                error={formik.touched[field] && Boolean(formik.errors[field])}
              >
                <FieldLabel icon={PeopleAltOutlinedIcon} label={label} required />
                <StyledInput
                  type="number"
                  value={formik.values[field]}
                  onChange={formik.handleChange(field)}
                  onBlur={formik.handleBlur(field)}
                  placeholder="0"
                  error={formik.touched[field] && Boolean(formik.errors[field])}
                  inputProps={{ min: 0 }}
                />
                {formik.touched[field] && formik.errors[field] && (
                  <FormHelperText>{formik.errors[field]}</FormHelperText>
                )}
              </FormControl>
            ))}
          </Grid2>

          {/* ── Pre-Audit Cooking Info ── */}
          <SectionTitle label="Pre-Audit Cooking Information" />
          <Grid2>
            <YesNoField
              label="Has Cookstove Observed?"
              icon={LocalFireDepartmentOutlinedIcon}
              value={formik.values.has_cookstove_observe}
              onChange={(val) => formik.setFieldValue("has_cookstove_observe", val)}
              tooltip="Was a cookstove observed at the household during this audit visit?"
            />

            <FormControl fullWidth>
              <FieldLabel icon={LocalFireDepartmentOutlinedIcon} label="Cooking Method Before" />
              <StyledInput
                value={formik.values.cooking_method_before}
                onChange={formik.handleChange("cooking_method_before")}
                onBlur={formik.handleBlur("cooking_method_before")}
                placeholder="e.g. Threestone fire"
              />
            </FormControl>

            <FormControl fullWidth>
              <FieldLabel icon={LocalGasStationOutlinedIcon} label="Fuel Used Before" />
              <StyledInput
                value={formik.values.fuel_used_before}
                onChange={formik.handleChange("fuel_used_before")}
                onBlur={formik.handleBlur("fuel_used_before")}
                placeholder="e.g. Firewood"
              />
            </FormControl>

            <YesNoField
              label="Other Cooking Device Before?"
              icon={LocalFireDepartmentOutlinedIcon}
              value={formik.values.other_cooking_device_before}
              onChange={(val) =>
                formik.setFieldValue("other_cooking_device_before", val)
              }
            />
          </Grid2>

          {/* ── Payment & Training ── */}
          <SectionTitle label="Payment & Training" />
          <Grid2>
            <YesNoField
              label="Payment Requested?"
              icon={PaymentOutlinedIcon}
              value={formik.values.payment_requested}
              onChange={(val) => formik.setFieldValue("payment_requested", val)}
              tooltip="Was any payment requested from the beneficiary during this audit?"
            />

            <FormControl fullWidth>
              <FieldLabel icon={PersonOutlineOutlinedIcon} label="Payment Requested By" />
              <StyledInput
                value={formik.values.payment_requested_by}
                onChange={formik.handleChange("payment_requested_by")}
                onBlur={formik.handleBlur("payment_requested_by")}
                placeholder="e.g. Agent name"
              />
            </FormControl>

            <YesNoField
              label="Training Before Receiving?"
              icon={SchoolOutlinedIcon}
              value={formik.values.training_before_receiving}
              onChange={(val) =>
                formik.setFieldValue("training_before_receiving", val)
              }
              tooltip="Was training provided to the beneficiary before receiving the cookstove?"
            />
          </Grid2>

          {/* ── Consent & Delivery ── */}
          <SectionTitle label="Consent & Delivery" />
          <Grid2>
            <YesNoField
              label="REA Consent?"
              icon={GavelOutlinedIcon}
              value={formik.values.rea_conset}
              onChange={(val) => formik.setFieldValue("rea_conset", val)}
              tooltip="Did the beneficiary provide REA consent?"
            />

            <YesNoField
              label="Sign Consent?"
              icon={GavelOutlinedIcon}
              value={formik.values.sign_consent}
              onChange={(val) => formik.setFieldValue("sign_consent", val)}
              tooltip="Did the beneficiary sign the consent form?"
            />

            <YesNoField
              label="Delivered in Good Condition?"
              icon={CheckCircleOutlineOutlinedIcon}
              value={formik.values.delivered_condition}
              onChange={(val) => formik.setFieldValue("delivered_condition", val)}
              tooltip="Was the cookstove delivered to the beneficiary in good working condition?"
            />

            <FormControl fullWidth>
              <FieldLabel icon={CalendarTodayOutlinedIcon} label="Delivered Cook Stove Date" />
              <StyledInput
                type="date"
                value={formik.values.delivered_cook_stove}
                onChange={formik.handleChange("delivered_cook_stove")}
                onBlur={formik.handleBlur("delivered_cook_stove")}
              />
            </FormControl>
          </Grid2>

          {/* ── Location ── */}
          <SectionTitle label="Location Details" />
          <Grid2>
            <FormControl fullWidth>
              <FieldLabel icon={PlaceOutlinedIcon} label="Where Received" />
              <StyledInput
                value={formik.values.where_received}
                onChange={formik.handleChange("where_received")}
                onBlur={formik.handleBlur("where_received")}
                placeholder="e.g. ICH"
              />
            </FormControl>

            <FormControl fullWidth>
              <FieldLabel icon={PlaceOutlinedIcon} label="Where Trained" />
              <StyledInput
                value={formik.values.where_trained}
                onChange={formik.handleChange("where_trained")}
                onBlur={formik.handleBlur("where_trained")}
                placeholder="e.g. ICH"
              />
            </FormControl>

            <FormControl fullWidth>
              <FieldLabel icon={LocationOnOutlinedIcon} label="Latitude" />
              <StyledInput
                value={formik.values.latitude}
                onChange={formik.handleChange("latitude")}
                onBlur={formik.handleBlur("latitude")}
                placeholder="e.g. 18.506065"
              />
            </FormControl>

            <FormControl fullWidth>
              <FieldLabel icon={LocationOnOutlinedIcon} label="Longitude" />
              <StyledInput
                value={formik.values.longitude}
                onChange={formik.handleChange("longitude")}
                onBlur={formik.handleBlur("longitude")}
                placeholder="e.g. 73.796587"
              />
            </FormControl>
          </Grid2>

          {/* ── Remarks & Sync ── */}
          <SectionTitle label="Remarks & Sync" />
          <Grid2>
            <FormControl fullWidth>
              <FieldLabel icon={NotesOutlinedIcon} label="Remarks" />
              <InputBase
                multiline
                rows={3}
                value={formik.values.remarks}
                onChange={formik.handleChange("remarks")}
                onBlur={formik.handleBlur("remarks")}
                placeholder="Any additional remarks..."
                sx={{
                  border: "1.5px solid #e5e7eb",
                  borderRadius: "10px",
                  px: 1.75,
                  py: 1.1,
                  fontSize: "0.88rem",
                  color: "#111827",
                  background: "#ffffff",
                  alignItems: "flex-start",
                  "& textarea": { "&::placeholder": { color: "#b0b7c3", fontSize: "0.85rem" } },
                  "&:hover": { borderColor: "#9ca3af", background: "#fafafa" },
                  "&.Mui-focused": {
                    borderColor: "#16a34a",
                    background: "#fff",
                    boxShadow: "0 0 0 3px rgba(22,163,74,0.1)",
                  },
                }}
              />
            </FormControl>

            <FormControl fullWidth>
              <FieldLabel icon={SyncOutlinedIcon} label="Sync Status" />
              <StyledSelect
                value={formik.values.s_is_sync}
                onChange={formik.handleChange("s_is_sync")}
                onBlur={formik.handleBlur("s_is_sync")}
              >
                <MenuItem value="Y" sx={{ fontSize: "0.88rem" }}>Y — Synced</MenuItem>
                <MenuItem value="N" sx={{ fontSize: "0.88rem" }}>N — Not Synced</MenuItem>
              </StyledSelect>
            </FormControl>
          </Grid2>

          {/* ── Attachments ── */}
          <SectionTitle label="Attachments" />
          <Grid2>
            <ImageUploadField
              label="Cook Stove Photo"
              icon={LocalFireDepartmentOutlinedIcon}
              fieldKey="photo_path_cook_stove"
              value={formik.values.photo_path_cook_stove}
              existingUrl={initialData?.photo_path_cook_stove}
              onChange={(file) => formik.setFieldValue("photo_path_cook_stove", file)}
            />
            <ImageUploadField
              label="Cook Stove Area Photo"
              icon={HomeOutlinedIcon}
              fieldKey="photo_path_cook_stove_area"
              value={formik.values.photo_path_cook_stove_area}
              existingUrl={initialData?.photo_path_cook_stove_area}
              onChange={(file) =>
                formik.setFieldValue("photo_path_cook_stove_area", file)
              }
            />
          </Grid2>

        </Box>
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
              <CircularProgress size={14} sx={{ color: "rgba(255,255,255,0.7)" }} />
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
              boxShadow: "0 4px 12px rgba(22,163,74,0.35)",
            },
            "&:active": { transform: "translateY(0)" },
            "&.Mui-disabled": { background: "#d1d5db", color: "#9ca3af" },
          }}
        >
          {formik.isSubmitting ? "Saving..." : "Update"}
        </Button>
      </Box>
    </Dialog>
  );
};

export default EditAuditDialog;