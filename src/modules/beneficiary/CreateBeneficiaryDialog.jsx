import React, { useEffect, useRef, useState } from "react";
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
  DialogActions,
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
import TranslateOutlinedIcon from "@mui/icons-material/TranslateOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchableCreatableSelect from "../../components/SearchableCreatableSelect";

const BASE_IMAGE_URL = "http://192.168.0.106:3000";

const initialValues = {
  training_site: "",
  first_name: "",
  last_name: "",
  mobile_no: "",
  national_id: "",
  other_cookstove: "no",
  females_below_18: "",
  females_above_18: "",
  males_below_18: "",
  males_above_18: "",
  cooking_method: "",
  language: "",
  read_doc: "no",
  understood_doc: "no",
  read_to_you: "no",
  stove_status_delivery: "no",
  no_other_cook_stove_present: "no",
  primary_residence_confirmation: "no",
  national_id_attachment: null,
  signature: null,
  house_pic: null,
  cookstove_pic: null,
};
const validationSchema = Yup.object({
  training_site: Yup.string().required("Training site is required"),
  first_name: Yup.string()
    .matches(/^[A-Za-z\s]+$/, "Only letters and spaces are allowed")
    .required("First name is required"),
  last_name: Yup.string()
    .matches(/^[A-Za-z\s]+$/, "Only letters and spaces are allowed")
    .required("Last name is required"),
  mobile_no: Yup.string()
    .matches(/^\+?[0-9]{6,15}$/, "Must be 6–15 digits")
    .required("Contact number is required"),
  national_id: Yup.string()
    .matches(/^[A-Z0-9]+$/, "Only uppercase letters and numbers are allowed")
    .required("National ID is required"),
  cooking_method: Yup.string().required("Cooking method is required"),
  language: Yup.string().required("Language is required"),
  other_cookstove: Yup.string().oneOf(["yes", "no"]).required(),
  read_doc: Yup.string().oneOf(["yes", "no"]).required(),
  understood_doc: Yup.string().oneOf(["yes", "no"]).required(),
  read_to_you: Yup.string().oneOf(["yes", "no"]).required(),
  stove_status_delivery: Yup.string().oneOf(["yes", "no"]).required(),
  no_other_cook_stove_present: Yup.string().oneOf(["yes", "no"]).required(),
  primary_residence_confirmation: Yup.string().oneOf(["yes", "no"]).required(),
  females_below_18: Yup.number()
    .typeError("Must be a number")
    .min(0)
    .required("Females below 18 is required"),
  females_above_18: Yup.number()
    .typeError("Must be a number")
    .min(0)
    .required("Females above 18 is required"),
  males_below_18: Yup.number()
    .typeError("Must be a number")
    .min(0)
    .required("Males below 18 is required"),
  males_above_18: Yup.number()
    .typeError("Must be a number")
    .min(0)
    .required("Males above 18 is required"),
});

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

const ImageUploadField = ({
  label,
  icon: Icon,
  fieldKey,
  value,
  onChange,
  existingUrl,
}) => {
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
    existingUrl &&
    existingUrl !== "null" &&
    existingUrl !== "-" &&
    existingUrl !== null
      ? `${BASE_IMAGE_URL}/${existingUrl.replace(/^\//, "")}`
      : null;

  //const displaySrc = preview || (!imgError ? serverUrl : null);
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
    onChange(null);
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
          // ── Image preview with overlay controls ──
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
            {/* Hover overlay */}
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
                sx={{
                  background: "rgba(255,255,255,0.9)",
                  "&:hover": { background: "#fff" },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox(displaySrc);
                }}
              >
                <ZoomInIcon fontSize="small" sx={{ color: "#374151" }} />
              </IconButton>
              <IconButton
                size="small"
                sx={{
                  background: "rgba(255,255,255,0.9)",
                  "&:hover": { background: "#fff" },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
              >
                <AddPhotoAlternateOutlinedIcon
                  fontSize="small"
                  sx={{ color: "#16a34a" }}
                />
              </IconButton>
              <IconButton
                size="small"
                sx={{
                  background: "rgba(255,255,255,0.9)",
                  "&:hover": { background: "#fff" },
                }}
                onClick={handleRemove}
              >
                <CloseIcon fontSize="small" sx={{ color: "#ef4444" }} />
              </IconButton>
            </Box>
          </Box>
        ) : (
          // ── Empty upload placeholder ──
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
            <AddPhotoAlternateOutlinedIcon
              sx={{ color: "#9ca3af", fontSize: 28 }}
            />
            <Typography
              sx={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 500 }}
            >
              Click to upload
            </Typography>
          </Box>
        )}
      </Box>
    </>
  );
};

const SectionTitle = ({ label }) => (
  <Grid item xs={12}>
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
  </Grid>
);

const FieldLabel = ({ icon: Icon, label, required }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 0.75,
      mb: 1,
      whiteSpace: "nowrap",
    }}
  >
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

const StyledInput = ({
  value,
  onChange,
  onBlur,
  type = "text",
  placeholder,
  error,
  inputProps,
}) => (
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
          ? "0 0 0 3px rgba(239,68,68,0.1)"
          : "0 0 0 3px rgba(22,163,74,0.1)",
      },
    }}
  />
);

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
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: error ? "#ef4444" : "#9ca3af",
      },
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

// ── Updated YesNoField with optional tooltip ──
const YesNoField = ({ label, icon: Icon, value, onChange, tooltip }) => (
  <Box>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        mb: 1,
      }}
    >
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
      <RadioGroup
        row
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{ gap: 1 }}
      >
        {["yes", "no"].map((opt) => (
          <FormControlLabel
            key={opt}
            value={opt}
            control={
              <Radio
                size="small"
                sx={{
                  color: "#d1d5db",
                  "&.Mui-checked": { color: "#16a34a" },
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
                    value === opt
                      ? opt === "yes"
                        ? "#16a34a"
                        : "#ef4444"
                      : "#6b7280",
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

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const CreateBeneficiaryDialog = ({
  open,
  onClose,
  onSubmit,
  initialData,
  trainingSiteOptions = [],
  cookingMethodOptions = [],
  languageOptions = [],
  onSearchTrainingSite,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isEdit = Boolean(initialData);

  const formik = useFormik({
    initialValues: initialData
      ? { ...initialValues, ...initialData }
      : initialValues,
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

  const blockNonAlpha = (e) => {
    if (!/^[A-Za-z\s]$/.test(e.key) && e.key.length === 1) e.preventDefault();
  };
  const blockNonPhone = (e) => {
    const isPlus =
      e.key === "+" &&
      e.target.selectionStart === 0 &&
      !e.target.value.includes("+");
    if (!/^[0-9]$/.test(e.key) && !isPlus && e.key.length === 1)
      e.preventDefault();
  };
  const handleNationalIdChange = (e) => {
    formik.setFieldValue(
      "national_id",
      e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
    );
  };

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
          boxShadow:
            "0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
        },
      }}
      BackdropProps={{
        sx: { background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" },
      }}
    >
      <Box
        sx={{
          background:
            "linear-gradient(135deg, #166534 0%, #16a34a 60%, #4ade80 100%)",
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
            color: "#fff",
            fontSize: "1.2rem",
            letterSpacing: "-0.01em",
          }}
        >
          {isEdit ? "Update Beneficiary" : "Create Beneficiary"}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "rgba(255,255,255,0.7)", mt: 0.25, fontSize: "0.8rem" }}
        >
          {isEdit
            ? "Modify the details of this beneficiary below."
            : "Fill in the details to register a new beneficiary."}
        </Typography>
      </Box>

      {/* ── Form Body ── */}
      <DialogContent
        sx={{ px: { xs: 2.5, sm: 4 }, py: 3, background: "#f8fafc" }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <SectionTitle label="Site & Cooking Details" />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 3,
                justifyContent: "space-between",
                alignItems: "start",
              }}
            >
              {" "}
              <FormControl
                fullWidth
                error={
                  formik.touched.training_site &&
                  Boolean(formik.errors.training_site)
                }
              >
                <FieldLabel
                  icon={LocationOnOutlinedIcon}
                  label="Training Site Location"
                  required
                />

                <SearchableCreatableSelect
                  label="Search Training Site"
                  value={formik.values.training_site}
                  error={
                    formik.touched.training_site &&
                    Boolean(formik.errors.training_site)
                  }
                  options={trainingSiteOptions}
                  loading={false}
                  labelKey="training_site"
                  onSearch={onSearchTrainingSite}
                  onChange={(val) => {
                    formik.setFieldValue(
                      "training_site",
                      val?.training_site ?? "",
                    );
                    formik.setFieldTouched("training_site", true, false);
                  }}
                  onCreate={() => {}}
                  allowCreate={false}
                  width="100%"
                  height={46}
                />
                {formik.touched.training_site &&
                  formik.errors.training_site && (
                    <FormHelperText error>
                      {formik.errors.training_site}
                    </FormHelperText>
                  )}
              </FormControl>
              <YesNoField
                label="Any other cookstove from other suppliers?"
                icon={LocalFireDepartmentOutlinedIcon}
                value={formik.values.other_cookstove}
                onChange={(val) => formik.setFieldValue("other_cookstove", val)}
              />
            </Box>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <SectionTitle label="Personal Information" />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 3,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <FormControl
                fullWidth
                error={
                  formik.touched.first_name && Boolean(formik.errors.first_name)
                }
              >
                <FieldLabel
                  icon={PersonOutlineOutlinedIcon}
                  label="First Name"
                  required
                />
                <StyledInput
                  value={formik.values.first_name}
                  onChange={formik.handleChange("first_name")}
                  onBlur={formik.handleBlur("first_name")}
                  placeholder="e.g. John"
                  error={
                    formik.touched.first_name &&
                    Boolean(formik.errors.first_name)
                  }
                  inputProps={{ onKeyDown: blockNonAlpha }}
                />
                {formik.touched.first_name && formik.errors.first_name && (
                  <FormHelperText>{formik.errors.first_name}</FormHelperText>
                )}
              </FormControl>
              <FormControl
                fullWidth
                error={
                  formik.touched.last_name && Boolean(formik.errors.last_name)
                }
              >
                <FieldLabel
                  icon={PersonOutlineOutlinedIcon}
                  label="Last Name"
                  required
                />
                <StyledInput
                  value={formik.values.last_name}
                  onChange={formik.handleChange("last_name")}
                  onBlur={formik.handleBlur("last_name")}
                  placeholder="e.g. Doe"
                  error={
                    formik.touched.last_name && Boolean(formik.errors.last_name)
                  }
                  inputProps={{ onKeyDown: blockNonAlpha }}
                />
                {formik.touched.last_name && formik.errors.last_name && (
                  <FormHelperText>{formik.errors.last_name}</FormHelperText>
                )}
              </FormControl>
              <FormControl
                fullWidth
                error={
                  formik.touched.mobile_no && Boolean(formik.errors.mobile_no)
                }
              >
                <FieldLabel
                  icon={PhoneOutlinedIcon}
                  label="Contact Number"
                  required
                />
                <StyledInput
                  value={formik.values.mobile_no}
                  onChange={formik.handleChange("mobile_no")}
                  onBlur={formik.handleBlur("mobile_no")}
                  placeholder="+265 999 000 000"
                  error={
                    formik.touched.mobile_no && Boolean(formik.errors.mobile_no)
                  }
                  inputProps={{ onKeyDown: blockNonPhone, maxLength: 15 }}
                />
                {formik.touched.mobile_no && formik.errors.mobile_no && (
                  <FormHelperText>{formik.errors.mobile_no}</FormHelperText>
                )}
              </FormControl>
              <FormControl
                fullWidth
                error={
                  formik.touched.national_id &&
                  Boolean(formik.errors.national_id)
                }
              >
                <FieldLabel
                  icon={BadgeOutlinedIcon}
                  label="National ID"
                  required
                />
                <StyledInput
                  value={formik.values.national_id}
                  onChange={handleNationalIdChange}
                  onBlur={formik.handleBlur("national_id")}
                  placeholder="e.g. SG1005"
                  error={
                    formik.touched.national_id &&
                    Boolean(formik.errors.national_id)
                  }
                />
                {formik.touched.national_id && formik.errors.national_id && (
                  <FormHelperText>{formik.errors.national_id}</FormHelperText>
                )}
              </FormControl>
            </Box>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <SectionTitle label="Cooking Method & Language" />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 3,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {" "}
              <FormControl
                fullWidth
                error={
                  formik.touched.cooking_method &&
                  Boolean(formik.errors.cooking_method)
                }
              >
                <FieldLabel
                  icon={LocalFireDepartmentOutlinedIcon}
                  label="Cooking Method"
                  required
                />
                <StyledSelect
                  value={formik.values.cooking_method}
                  onChange={formik.handleChange("cooking_method")}
                  onBlur={formik.handleBlur("cooking_method")}
                  error={
                    formik.touched.cooking_method &&
                    Boolean(formik.errors.cooking_method)
                  }
                >
                  <MenuItem value="" disabled>
                    <em style={{ color: "#b0b7c3", fontSize: "0.85rem" }}>
                      Select Cooking Method
                    </em>
                  </MenuItem>
                  {cookingMethodOptions.map((opt, i) => {
                    const label =
                      typeof opt === "string"
                        ? opt
                        : opt.cookstove_name || opt.cooking_method || "";
                    return (
                      <MenuItem
                        key={i}
                        value={label}
                        sx={{ fontSize: "0.88rem" }}
                      >
                        {label}
                      </MenuItem>
                    );
                  })}
                </StyledSelect>
                {formik.touched.cooking_method &&
                  formik.errors.cooking_method && (
                    <FormHelperText>
                      {formik.errors.cooking_method}
                    </FormHelperText>
                  )}
              </FormControl>
              <FormControl
                fullWidth
                error={
                  formik.touched.language && Boolean(formik.errors.language)
                }
              >
                <FieldLabel
                  icon={TranslateOutlinedIcon}
                  label="Select Language"
                  required
                />
                <StyledSelect
                  value={formik.values.language}
                  onChange={formik.handleChange("language")}
                  onBlur={formik.handleBlur("language")}
                  error={
                    formik.touched.language && Boolean(formik.errors.language)
                  }
                >
                  <MenuItem value="" disabled>
                    <em style={{ color: "#b0b7c3", fontSize: "0.85rem" }}>
                      Select Language
                    </em>
                  </MenuItem>
                  {languageOptions.map((opt, i) => {
                    const label =
                      typeof opt === "string"
                        ? opt
                        : opt.lang_name || opt.language || "";
                    return (
                      <MenuItem
                        key={i}
                        value={label}
                        sx={{ fontSize: "0.88rem" }}
                      >
                        {label}
                      </MenuItem>
                    );
                  })}
                </StyledSelect>
                {formik.touched.language && formik.errors.language && (
                  <FormHelperText>{formik.errors.language}</FormHelperText>
                )}
              </FormControl>
            </Box>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <SectionTitle label="Household Members" />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 3,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {" "}
              {[
                { field: "females_below_18", label: "Females -18" },
                { field: "females_above_18", label: "Females +18" },
                { field: "males_below_18", label: "Males -18" },
                { field: "males_above_18", label: "Males +18" },
              ].map(({ field, label }) => (
                <Grid item xs={12} md={3} key={field}>
                  <FormControl
                    fullWidth
                    error={
                      formik.touched[field] && Boolean(formik.errors[field])
                    }
                  >
                    <FieldLabel
                      icon={PeopleAltOutlinedIcon}
                      label={label}
                      required
                    />
                    <StyledInput
                      type="number"
                      value={formik.values[field]}
                      onChange={formik.handleChange(field)}
                      onBlur={formik.handleBlur(field)}
                      placeholder="0"
                      error={
                        formik.touched[field] && Boolean(formik.errors[field])
                      }
                      inputProps={{ min: 0 }}
                    />
                    {formik.touched[field] && formik.errors[field] && (
                      <FormHelperText>{formik.errors[field]}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              ))}
            </Box>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <SectionTitle label="Document Confirmation" />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 3,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {" "}
              <YesNoField
                label="Would you like to read this?"
                icon={MenuBookOutlinedIcon}
                value={formik.values.read_doc}
                onChange={(val) => formik.setFieldValue("read_doc", val)}
              />
              <YesNoField
                label="Has the person understood the document?"
                icon={MenuBookOutlinedIcon}
                value={formik.values.understood_doc}
                onChange={(val) => formik.setFieldValue("understood_doc", val)}
              />
              <YesNoField
                label="Would you like the document read to you?"
                icon={MenuBookOutlinedIcon}
                value={formik.values.read_to_you}
                onChange={(val) => formik.setFieldValue("read_to_you", val)}
              />
            </Box>
          </Box>{" "}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <SectionTitle label="Eligibility Confirmation" />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 3,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {" "}
              <YesNoField
                label="Received 1 cookstove in good condition?"
                icon={CheckCircleOutlineOutlinedIcon}
                value={formik.values.stove_status_delivery}
                onChange={(val) =>
                  formik.setFieldValue("stove_status_delivery", val)
                }
                tooltip="I can confirm that the household has only received 1 cookstove and that the cookstove was delivered in good condition and in full working order."
              />
              <YesNoField
                label="No other cook stove present?"
                icon={CheckCircleOutlineOutlinedIcon}
                value={formik.values.no_other_cook_stove_present}
                onChange={(val) =>
                  formik.setFieldValue("no_other_cook_stove_present", val)
                }
                tooltip="I confirm I performed a visual inspection of the household and that no other cookstove from any other company was found or was deemed to have recently been removed from the household."
              />
              <YesNoField
                label="Primary residence confirmation?"
                icon={HomeOutlinedIcon}
                value={formik.values.primary_residence_confirmation}
                onChange={(val) =>
                  formik.setFieldValue("primary_residence_confirmation", val)
                }
                tooltip="I can confirm that the beneficiary lives at this household and that they are the primary resident of this household."
              />
            </Box>
          </Box>{" "}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <SectionTitle label="Attachments" />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 3,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <ImageUploadField
                label="National ID Attachment"
                icon={BadgeOutlinedIcon}
                fieldKey="national_id_attachment"
                value={formik.values.national_id_attachment}
                existingUrl={initialData?.national_id_attachment}
                onChange={(file) =>
                  formik.setFieldValue("national_id_attachment", file)
                }
              />
              <ImageUploadField
                label="Beneficiary Signature"
                icon={CheckCircleOutlineOutlinedIcon}
                fieldKey="signature"
                value={formik.values.signature}
                existingUrl={initialData?.signature}
                onChange={(file) => formik.setFieldValue("signature", file)}
              />
              <ImageUploadField
                label="House"
                icon={HomeOutlinedIcon}
                fieldKey="house_pic"
                value={formik.values.house_pic}
                existingUrl={initialData?.house_pic}
                onChange={(file) => formik.setFieldValue("house_pic", file)}
              />
              <ImageUploadField
                label="Cook Stove"
                icon={LocalFireDepartmentOutlinedIcon}
                fieldKey="cookstove_pic"
                value={formik.values.cookstove_pic}
                existingUrl={initialData?.cookstove_pic}
                onChange={(file) => formik.setFieldValue("cookstove_pic", file)}
              />
            </Box>
          </Box>
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
              boxShadow: "0 4px 12px rgba(22,163,74,0.35)",
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

export default CreateBeneficiaryDialog;
