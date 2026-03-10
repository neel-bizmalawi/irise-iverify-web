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
import LocalFireDepartmentOutlinedIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DevicesOutlinedIcon from "@mui/icons-material/DevicesOutlined";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import LocalGasStationOutlinedIcon from "@mui/icons-material/LocalGasStationOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";

const BASE_IMAGE_URL = "http://192.168.0.106:3000";

const initialValues = {
  national_id: "",
  agent_name: "",
  device_serial_no: "",
  new_device_serial_no: "",
  hh_name_same: "no",
  stoves_present: "no",
  stove_being_used: "no",
  times_used_today: "",
  stove_condition: "",
  nfc_tag_status: "",
  user_satisfaction: "",
  fuel_type: "",
  daily_fuel_cost: "",
  savings_3_months: "",
  est_fuel_last3meals_kg: "",
  needs_training: "no",
  training_type: "",
  training_performed: "",
  training_not_done_reason: "",
  needs_more_visits: "no",
  more_visits_reason: "",
  health_hospital_less: "no",
  health_better_air: "no",
  old_gps_lat: "",
  old_gps_lng: "",
  new_gps_lat: "",
  new_gps_lng: "",
  photo_path: null,
  photo_url: null,
};

const validationSchema = Yup.object({
  national_id: Yup.string().required("National ID is required"),
  hh_name_same: Yup.string().oneOf(["yes", "no"]).required(),
  stoves_present: Yup.string().oneOf(["yes", "no"]).required(),
  stove_being_used: Yup.string().oneOf(["yes", "no"]).required(),
  needs_training: Yup.string().oneOf(["yes", "no"]).required(),
  needs_more_visits: Yup.string().oneOf(["yes", "no"]).required(),
  health_hospital_less: Yup.string().oneOf(["yes", "no"]).required(),
  health_better_air: Yup.string().oneOf(["yes", "no"]).required(),
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
const EditMonitoringDialog = ({ open, onClose, onSubmit, initialData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
          Update Monitoring Record
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "rgba(255,255,255,0.7)", mt: 0.25, fontSize: "0.8rem" }}
        >
          Modify the details of this monitoring visit below.
        </Typography>
      </Box>

      {/* ── Form Body ── */}
      <DialogContent sx={{ px: { xs: 2.5, sm: 4 }, py: 3, background: "#f8fafc" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

          {/* ── Identification ── */}
          <SectionTitle label="Identification" />
          <Grid2>
            <FormControl
              fullWidth
              error={formik.touched.national_id && Boolean(formik.errors.national_id)}
            >
              <FieldLabel icon={BadgeOutlinedIcon} label="National ID" required />
              <StyledInput
                value={formik.values.national_id}
                onChange={formik.handleChange("national_id")}
                onBlur={formik.handleBlur("national_id")}
                placeholder="e.g. AK3001"
                error={formik.touched.national_id && Boolean(formik.errors.national_id)}
              />
              {formik.touched.national_id && formik.errors.national_id && (
                <FormHelperText>{formik.errors.national_id}</FormHelperText>
              )}
            </FormControl>

            <FormControl fullWidth>
              <FieldLabel icon={PersonOutlineOutlinedIcon} label="Agent Name" />
              <StyledInput
                value={formik.values.agent_name}
                onChange={formik.handleChange("agent_name")}
                onBlur={formik.handleBlur("agent_name")}
                placeholder="e.g. John Doe"
              />
            </FormControl>
          </Grid2>

          {/* ── Device Info ── */}
          <SectionTitle label="Device Information" />
          <Grid2>
            <FormControl fullWidth>
              <FieldLabel icon={DevicesOutlinedIcon} label="Device Serial No" />
              <StyledInput
                value={formik.values.device_serial_no}
                onChange={formik.handleChange("device_serial_no")}
                onBlur={formik.handleBlur("device_serial_no")}
                placeholder="e.g. AK1002"
              />
            </FormControl>

            <FormControl fullWidth>
              <FieldLabel icon={DevicesOutlinedIcon} label="New Device Serial No" />
              <StyledInput
                value={formik.values.new_device_serial_no}
                onChange={formik.handleChange("new_device_serial_no")}
                onBlur={formik.handleBlur("new_device_serial_no")}
                placeholder="e.g. AK1002"
              />
            </FormControl>

            <FormControl fullWidth>
              <FieldLabel icon={DevicesOutlinedIcon} label="NFC Tag Status" />
              <StyledSelect
                value={formik.values.nfc_tag_status}
                onChange={formik.handleChange("nfc_tag_status")}
                onBlur={formik.handleBlur("nfc_tag_status")}
              >
                <MenuItem value=""><em style={{ color: "#b0b7c3", fontSize: "0.85rem" }}>Select Status</em></MenuItem>
                {["Active", "Inactive", "Missing", "Damaged"].map((opt) => (
                  <MenuItem key={opt} value={opt} sx={{ fontSize: "0.88rem" }}>{opt}</MenuItem>
                ))}
              </StyledSelect>
            </FormControl>

            <YesNoField
              label="HH Name Same?"
              icon={HomeOutlinedIcon}
              value={formik.values.hh_name_same}
              onChange={(val) => formik.setFieldValue("hh_name_same", val)}
              tooltip="Is the household head's name the same as recorded?"
            />
          </Grid2>

          {/* ── Stove Status ── */}
          <SectionTitle label="Stove Status" />
          <Grid2>
            <YesNoField
              label="Stoves Present?"
              icon={LocalFireDepartmentOutlinedIcon}
              value={formik.values.stoves_present}
              onChange={(val) => formik.setFieldValue("stoves_present", val)}
            />
            <YesNoField
              label="Stove Being Used?"
              icon={LocalFireDepartmentOutlinedIcon}
              value={formik.values.stove_being_used}
              onChange={(val) => formik.setFieldValue("stove_being_used", val)}
            />

            <FormControl fullWidth>
              <FieldLabel icon={LocalFireDepartmentOutlinedIcon} label="Times Used Today" />
              <StyledInput
                type="number"
                value={formik.values.times_used_today}
                onChange={formik.handleChange("times_used_today")}
                onBlur={formik.handleBlur("times_used_today")}
                placeholder="e.g. 3"
                inputProps={{ min: 0 }}
              />
            </FormControl>

            <FormControl fullWidth>
              <FieldLabel icon={CheckCircleOutlineOutlinedIcon} label="Stove Condition" />
              <StyledSelect
                value={formik.values.stove_condition}
                onChange={formik.handleChange("stove_condition")}
                onBlur={formik.handleBlur("stove_condition")}
              >
                <MenuItem value=""><em style={{ color: "#b0b7c3", fontSize: "0.85rem" }}>Select Condition</em></MenuItem>
                {["Good", "Fair", "Poor"].map((opt) => (
                  <MenuItem key={opt} value={opt} sx={{ fontSize: "0.88rem" }}>{opt}</MenuItem>
                ))}
              </StyledSelect>
            </FormControl>
          </Grid2>

          {/* ── User Satisfaction ── */}
          <SectionTitle label="User Satisfaction & Fuel" />
          <Grid2>
            <FormControl fullWidth>
              <FieldLabel icon={SentimentSatisfiedAltIcon} label="User Satisfaction" />
              <StyledSelect
                value={formik.values.user_satisfaction}
                onChange={formik.handleChange("user_satisfaction")}
                onBlur={formik.handleBlur("user_satisfaction")}
              >
                <MenuItem value=""><em style={{ color: "#b0b7c3", fontSize: "0.85rem" }}>Select Satisfaction</em></MenuItem>
                {["Happy", "Neutral", "Unhappy"].map((opt) => (
                  <MenuItem key={opt} value={opt} sx={{ fontSize: "0.88rem" }}>{opt}</MenuItem>
                ))}
              </StyledSelect>
            </FormControl>

            <FormControl fullWidth>
              <FieldLabel icon={LocalGasStationOutlinedIcon} label="Fuel Type" />
              <StyledSelect
                value={formik.values.fuel_type}
                onChange={formik.handleChange("fuel_type")}
                onBlur={formik.handleBlur("fuel_type")}
              >
                <MenuItem value=""><em style={{ color: "#b0b7c3", fontSize: "0.85rem" }}>Select Fuel Type</em></MenuItem>
                {["Indigenous Wood", "Charcoal", "Pellets", "LPG", "Other"].map((opt) => (
                  <MenuItem key={opt} value={opt} sx={{ fontSize: "0.88rem" }}>{opt}</MenuItem>
                ))}
              </StyledSelect>
            </FormControl>

            <FormControl fullWidth>
              <FieldLabel icon={LocalGasStationOutlinedIcon} label="Daily Fuel Cost" />
              <StyledInput
                type="number"
                value={formik.values.daily_fuel_cost}
                onChange={formik.handleChange("daily_fuel_cost")}
                onBlur={formik.handleBlur("daily_fuel_cost")}
                placeholder="e.g. 2000"
                inputProps={{ min: 0 }}
              />
            </FormControl>

            <FormControl fullWidth>
              <FieldLabel icon={LocalGasStationOutlinedIcon} label="Savings (3 Months)" />
              <StyledInput
                type="number"
                value={formik.values.savings_3_months}
                onChange={formik.handleChange("savings_3_months")}
                onBlur={formik.handleBlur("savings_3_months")}
                placeholder="e.g. 40"
                inputProps={{ min: 0 }}
              />
            </FormControl>

            <FormControl fullWidth>
              <FieldLabel icon={LocalGasStationOutlinedIcon} label="Est. Fuel Last 3 Meals (kg)" />
              <StyledInput
                type="number"
                value={formik.values.est_fuel_last3meals_kg}
                onChange={formik.handleChange("est_fuel_last3meals_kg")}
                onBlur={formik.handleBlur("est_fuel_last3meals_kg")}
                placeholder="e.g. 6"
                inputProps={{ min: 0 }}
              />
            </FormControl>
          </Grid2>

          {/* ── Training ── */}
          <SectionTitle label="Training" />
          <Grid2>
            <YesNoField
              label="Needs Training?"
              icon={SchoolOutlinedIcon}
              value={formik.values.needs_training}
              onChange={(val) => formik.setFieldValue("needs_training", val)}
            />

            <FormControl fullWidth>
              <FieldLabel icon={SchoolOutlinedIcon} label="Training Type" />
              <StyledInput
                value={formik.values.training_type}
                onChange={formik.handleChange("training_type")}
                onBlur={formik.handleBlur("training_type")}
                placeholder="e.g. Refresher"
              />
            </FormControl>

            <FormControl fullWidth>
              <FieldLabel icon={SchoolOutlinedIcon} label="Training Performed" />
              <StyledInput
                value={formik.values.training_performed}
                onChange={formik.handleChange("training_performed")}
                onBlur={formik.handleBlur("training_performed")}
                placeholder="e.g. Basic usage"
              />
            </FormControl>

            <FormControl fullWidth>
              <FieldLabel icon={SchoolOutlinedIcon} label="Training Not Done Reason" />
              <StyledInput
                value={formik.values.training_not_done_reason}
                onChange={formik.handleChange("training_not_done_reason")}
                onBlur={formik.handleBlur("training_not_done_reason")}
                placeholder="e.g. Beneficiary absent"
              />
            </FormControl>
          </Grid2>

          {/* ── Follow-up Visits ── */}
          <SectionTitle label="Follow-up Visits" />
          <Grid2>
            <YesNoField
              label="Needs More Visits?"
              icon={CheckCircleOutlineOutlinedIcon}
              value={formik.values.needs_more_visits}
              onChange={(val) => formik.setFieldValue("needs_more_visits", val)}
            />

            <FormControl fullWidth>
              <FieldLabel icon={CheckCircleOutlineOutlinedIcon} label="More Visits Reason" />
              <StyledInput
                value={formik.values.more_visits_reason}
                onChange={formik.handleChange("more_visits_reason")}
                onBlur={formik.handleBlur("more_visits_reason")}
                placeholder="e.g. Follow up on usage"
              />
            </FormControl>
          </Grid2>

          {/* ── Health ── */}
          <SectionTitle label="Health Outcomes" />
          <Grid2>
            <YesNoField
              label="Hospital Visits Less?"
              icon={HealthAndSafetyOutlinedIcon}
              value={formik.values.health_hospital_less}
              onChange={(val) => formik.setFieldValue("health_hospital_less", val)}
              tooltip="Has the household reported fewer hospital visits since using the cookstove?"
            />
            <YesNoField
              label="Better Air Quality?"
              icon={HealthAndSafetyOutlinedIcon}
              value={formik.values.health_better_air}
              onChange={(val) => formik.setFieldValue("health_better_air", val)}
              tooltip="Has the household noticed improved air quality inside the home?"
            />
          </Grid2>

          {/* ── GPS Coordinates ── */}
          <SectionTitle label="GPS Coordinates" />
          <Grid2 cols={4}>
            <FormControl fullWidth>
              <FieldLabel icon={LocationOnOutlinedIcon} label="Old GPS Lat" />
              <StyledInput
                value={formik.values.old_gps_lat}
                onChange={formik.handleChange("old_gps_lat")}
                onBlur={formik.handleBlur("old_gps_lat")}
                placeholder="e.g. 18.5060"
              />
            </FormControl>
            <FormControl fullWidth>
              <FieldLabel icon={LocationOnOutlinedIcon} label="Old GPS Lng" />
              <StyledInput
                value={formik.values.old_gps_lng}
                onChange={formik.handleChange("old_gps_lng")}
                onBlur={formik.handleBlur("old_gps_lng")}
                placeholder="e.g. 73.7965"
              />
            </FormControl>
            <FormControl fullWidth>
              <FieldLabel icon={LocationOnOutlinedIcon} label="New GPS Lat" />
              <StyledInput
                value={formik.values.new_gps_lat}
                onChange={formik.handleChange("new_gps_lat")}
                onBlur={formik.handleBlur("new_gps_lat")}
                placeholder="e.g. 18.5060"
              />
            </FormControl>
            <FormControl fullWidth>
              <FieldLabel icon={LocationOnOutlinedIcon} label="New GPS Lng" />
              <StyledInput
                value={formik.values.new_gps_lng}
                onChange={formik.handleChange("new_gps_lng")}
                onBlur={formik.handleBlur("new_gps_lng")}
                placeholder="e.g. 73.7965"
              />
            </FormControl>
          </Grid2>

          {/* ── Attachments ── */}
          <SectionTitle label="Attachments" />
          <Grid2>
            <ImageUploadField
              label="Photo"
              icon={AddPhotoAlternateOutlinedIcon}
              fieldKey="photo_path"
              value={formik.values.photo_path}
              existingUrl={initialData?.photo_path}
              onChange={(file) => formik.setFieldValue("photo_path", file)}
            />
            <ImageUploadField
              label="Photo URL"
              icon={AddPhotoAlternateOutlinedIcon}
              fieldKey="photo_url"
              value={formik.values.photo_url}
              existingUrl={initialData?.photo_url}
              onChange={(file) => formik.setFieldValue("photo_url", file)}
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

export default EditMonitoringDialog;