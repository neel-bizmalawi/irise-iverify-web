import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Button,
  IconButton,
  Typography,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  MenuItem,
  Select,
  InputLabel,
  Box,
  useTheme,
  useMediaQuery,
  Zoom,
  OutlinedInput,
  Chip,
  Tooltip,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import GroupIcon from "@mui/icons-material/Group";
import InfoIcon from "@mui/icons-material/Info";

const initialState = {
  otherCookstove: "",
  trainingSite: "",
  firstName: "",
  lastName: "",
  mobileNo: "",
  nationalId: "",
  cookingMethod: "",
  language: "",
  femalesBelow18: "",
  femalesAbove18: "",
  malesAbove18: "",
  malesBelow18: "",
  readDocument: "No",
  understoodDocument: "No",
  readToYou: "No",
  stoveGoodCondition: "No",
  noOtherStove: "No",
  primaryResidence: "No",
};

// Simplified Yes/No field to match training site style
const YesNoField = ({ label, value, onChange, tooltip }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <FormControl fullWidth>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
        <FormLabel
          sx={{
            fontWeight: 500,
            fontSize: isMobile ? "0.875rem" : "0.9rem",
            color: "#475569",
          }}
        >
          {label}
        </FormLabel>
        {tooltip && (
          <Tooltip title={tooltip} arrow placement="top">
            <InfoIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
          </Tooltip>
        )}
      </Box>
      <RadioGroup
        row={!isMobile}
        value={value}
        onChange={onChange}
        sx={{
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 0.5 : 2,
        }}
      >
        <FormControlLabel value="Yes" control={<Radio />} label="Yes" />
        <FormControlLabel value="No" control={<Radio />} label="No" />
      </RadioGroup>
    </FormControl>
  );
};

const CreateBeneficiaryDialog = ({ open, onClose, onSubmit }) => {
  const [form, setForm] = useState(initialState);
  const [touched, setTouched] = useState({});
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    if (!open) {
      setForm(initialState);
      setTouched({});
    }
  }, [open]);

  const handleChange = (key) => (e) => {
    const value = e.target.value;
    setForm({ ...form, [key]: value });
    setTouched({ ...touched, [key]: true });
  };

  const handleBlur = (key) => () => {
    setTouched({ ...touched, [key]: true });
  };

  const totalMembers =
    Number(form.femalesBelow18 || 0) +
    Number(form.femalesAbove18 || 0) +
    Number(form.malesBelow18 || 0) +
    Number(form.malesAbove18 || 0);

  const handleSubmit = () => {
    const allTouched = Object.keys(form).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    if (isFormValid()) {
      onSubmit?.(form);
      onClose();
    }
  };

  const isFormValid = () => {
    return (
      form.firstName?.trim() &&
      form.lastName?.trim() &&
      form.mobileNo?.trim() &&
      form.nationalId?.trim() &&
      form.trainingSite &&
      form.cookingMethod &&
      totalMembers > 0
    );
  };

  const getFieldError = (field) => {
    if (!touched[field]) return false;

    switch (field) {
      case "firstName":
      case "lastName":
        return !form[field]?.trim();
      case "mobileNo":
        return (
          !form.mobileNo?.trim() ||
          !/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im.test(
            form.mobileNo,
          )
        );
      case "nationalId":
        return !form.nationalId?.trim();
      default:
        return false;
    }
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
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: "#f9fafb",
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>
        New Beneficiary Registration
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 4 }}>
        {/* Household summary (like Road Access box) */}
        {totalMembers > 0 && (
          <Box
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              background: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <GroupIcon sx={{ color: "#475569" }} />
              <Typography fontWeight={500}>Total Household Members</Typography>
            </Box>
            <Chip
              label={totalMembers}
              color="primary"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        )}

        <Grid container spacing={4}>
          {/* Row 1: First Name & Last Name */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FormLabel sx={{ mb: 1 }}>First Name *</FormLabel>
              <OutlinedInput
                value={form.firstName}
                onChange={handleChange("firstName")}
                onBlur={handleBlur("firstName")}
                error={getFieldError("firstName")}
                sx={{ borderRadius: 2, background: "#fff" }}
              />
              {getFieldError("firstName") && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  First name is required
                </Typography>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FormLabel sx={{ mb: 1 }}>Last Name *</FormLabel>
              <OutlinedInput
                value={form.lastName}
                onChange={handleChange("lastName")}
                onBlur={handleBlur("lastName")}
                error={getFieldError("lastName")}
                sx={{ borderRadius: 2, background: "#fff" }}
              />
              {getFieldError("lastName") && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  Last name is required
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Row 2: Mobile Number & National ID */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FormLabel sx={{ mb: 1 }}>Mobile Number *</FormLabel>
              <OutlinedInput
                value={form.mobileNo}
                onChange={handleChange("mobileNo")}
                onBlur={handleBlur("mobileNo")}
                error={getFieldError("mobileNo")}
                placeholder="+1234567890"
                sx={{ borderRadius: 2, background: "#fff" }}
              />
              {getFieldError("mobileNo") && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  Valid phone number required
                </Typography>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FormLabel sx={{ mb: 1 }}>National ID *</FormLabel>
              <OutlinedInput
                value={form.nationalId}
                onChange={handleChange("nationalId")}
                onBlur={handleBlur("nationalId")}
                error={getFieldError("nationalId")}
                sx={{ borderRadius: 2, background: "#fff" }}
              />
              {getFieldError("nationalId") && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  National ID is required
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Row 3: Training Site & Cooking Method */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FormLabel sx={{ mb: 1 }}>Training Site *</FormLabel>
              <Select
                value={form.trainingSite || ""}
                onChange={handleChange("trainingSite")}
                onBlur={handleBlur("trainingSite")}
                displayEmpty
                sx={{ borderRadius: 2, background: "#fff" }}
              >
                <MenuItem value="">
                  <em>Select a training site</em>
                </MenuItem>
                <MenuItem value="Site A">Site A - Central</MenuItem>
                <MenuItem value="Site B">Site B - North</MenuItem>
                <MenuItem value="Site C">Site C - South</MenuItem>
              </Select>
              {touched.trainingSite && !form.trainingSite && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  Training site is required
                </Typography>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FormLabel sx={{ mb: 1 }}>Cooking Method *</FormLabel>
              <Select
                value={form.cookingMethod || ""}
                onChange={handleChange("cookingMethod")}
                onBlur={handleBlur("cookingMethod")}
                displayEmpty
                sx={{ borderRadius: 2, background: "#fff" }}
              >
                <MenuItem value="">
                  <em>Select cooking method</em>
                </MenuItem>
                <MenuItem value="Wood">Wood Fire</MenuItem>
                <MenuItem value="Charcoal">Charcoal</MenuItem>
                <MenuItem value="Gas">Gas</MenuItem>
                <MenuItem value="Electric">Electric</MenuItem>
              </Select>
              {touched.cookingMethod && !form.cookingMethod && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  Cooking method is required
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Row 4: Girls (<18) & Women (>18) */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FormLabel sx={{ mb: 1 }}>Girls (under 18)</FormLabel>
              <OutlinedInput
                type="number"
                value={form.femalesBelow18}
                onChange={handleChange("femalesBelow18")}
                inputProps={{ min: 0 }}
                sx={{ borderRadius: 2, background: "#fff" }}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FormLabel sx={{ mb: 1 }}>Women (over 18)</FormLabel>
              <OutlinedInput
                type="number"
                value={form.femalesAbove18}
                onChange={handleChange("femalesAbove18")}
                inputProps={{ min: 0 }}
                sx={{ borderRadius: 2, background: "#fff" }}
              />
            </FormControl>
          </Grid>

          {/* Row 5: Boys (<18) & Men (>18) */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FormLabel sx={{ mb: 1 }}>Boys (under 18)</FormLabel>
              <OutlinedInput
                type="number"
                value={form.malesBelow18}
                onChange={handleChange("malesBelow18")}
                inputProps={{ min: 0 }}
                sx={{ borderRadius: 2, background: "#fff" }}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FormLabel sx={{ mb: 1 }}>Men (over 18)</FormLabel>
              <OutlinedInput
                type="number"
                value={form.malesAbove18}
                onChange={handleChange("malesAbove18")}
                inputProps={{ min: 0 }}
                sx={{ borderRadius: 2, background: "#fff" }}
              />
            </FormControl>
          </Grid>

          {/* Row 6: Document Confirmation (3 fields, but we'll do 2+1 with the last centered) */}
          <Grid item xs={12} md={6}>
            <YesNoField
              label="Would you like to read this document?"
              value={form.readDocument}
              onChange={handleChange("readDocument")}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <YesNoField
              label="Has the person understood the document?"
              value={form.understoodDocument}
              onChange={handleChange("understoodDocument")}
            />
          </Grid>
          <Grid item xs={12} md={6} sx={{ mx: "auto" }}>
            <YesNoField
              label="Would you like the document read to you?"
              value={form.readToYou}
              onChange={handleChange("readToYou")}
            />
          </Grid>

          {/* Row 7: Eligibility (3 fields, same pattern) */}
          <Grid item xs={12} md={6}>
            <YesNoField
              label="Received 1 cookstove in good condition?"
              value={form.stoveGoodCondition}
              onChange={handleChange("stoveGoodCondition")}
              tooltip="I can confirm that the household has only received 1 cookstove and that the cookstove was delivered in good condition and in full working order."
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <YesNoField
              label="No other cook stove present?"
              value={form.noOtherStove}
              onChange={handleChange("noOtherStove")}
              tooltip="I confirm I performed a visual inspection of the household and that no other cookstove from any other company was found or was deemed to have recently removed from the household."
            />
          </Grid>
          <Grid item xs={12} md={6} sx={{ mx: "auto" }}>
            <YesNoField
              label="Primary residence confirmation?"
              value={form.primaryResidence}
              onChange={handleChange("primaryResidence")}
              tooltip="I can confirm that the beneficiary lives at this household and that they are the primary resident of this household."
            />
          </Grid>
        </Grid>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 4, py: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!isFormValid()}
          sx={{
            background: "#16a34a",
            borderRadius: 2,
            px: 4,
            fontWeight: 600,
            textTransform: "none",
            "&:disabled": {
              background: "#e2e8f0",
              color: "#94a3b8",
            },
          }}
        >
          Create Beneficiary
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateBeneficiaryDialog;
