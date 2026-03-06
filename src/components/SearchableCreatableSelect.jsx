import React, { useState } from "react";
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Paper,
} from "@mui/material";

const SearchableCreatableSelect = ({
  label,
  value,
  options,
  loading,
  onSearch,
  onChange,
  onCreate,
  labelKey,
  allowCreate = true,
}) => {
  const [inputValue, setInputValue] = useState("");

  return (
    <Autocomplete
      freeSolo
      options={options}
      loading={loading}
      value={value || null}
      getOptionLabel={(option) =>
        typeof option === "string" ? option : option[labelKey] || ""
      }
      onInputChange={(event, newInput) => {
        setInputValue(newInput);
        onSearch?.(newInput);
      }}
      onChange={(event, newValue) => {
        if (allowCreate && typeof newValue === "string") {
          onCreate?.(newValue);
        } else if (allowCreate && newValue?.inputValue) {
          onCreate?.(newValue.inputValue);
        } else {
          onChange?.(newValue);
        }
      }}
      filterOptions={(options, params) => {
        const filtered = options.filter((opt) =>
          opt[labelKey]
            ?.toLowerCase()
            .includes(params.inputValue.toLowerCase()),
        );

        if (
          allowCreate &&
          params.inputValue !== "" &&
          !options.some(
            (opt) =>
              opt[labelKey].toLowerCase() === params.inputValue.toLowerCase(),
          )
        ) {
          filtered.push({
            inputValue: params.inputValue,
            [labelKey]: `Add "${params.inputValue}"`,
          });
        }

        return filtered;
      }}
      PaperComponent={(props) => (
        <Paper
          {...props}
          elevation={4}
          sx={{
            borderRadius: "10px",
            border: "1.5px solid #e5e7eb",
            mt: 0.5,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            "& .MuiAutocomplete-listbox": {
              fontSize: "0.88rem",
              color: "#111827",
              py: 0.5,
              "& .MuiAutocomplete-option": {
                px: 1.75,
                py: 0.9,
                fontSize: "0.88rem",
                "&:hover": { background: "#f0fdf4" },
                '&[aria-selected="true"]': {
                  background: "#dcfce7",
                  color: "#16a34a",
                  fontWeight: 600,
                },
              },
            },
          }}
        />
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={label}
          variant="outlined"
          size="small"
          InputLabelProps={{ shrink: false }}
          sx={{
            "& .MuiInputLabel-root": { display: "none" },
            "& .MuiOutlinedInput-root": {
              width: "187px",
              height: 47,
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              fontSize: "0.88rem",
              color: "#111827",
              padding: "0 !important",
              paddingRight: "14px !important",
              transition: "all 0.2s ease",
              "& input": {
                px: "14px",
                py: "9.5px",
                fontSize: "0.88rem",
                color: "#111827",
                "&::placeholder": {
                  color: "#b0b7c3",
                  fontSize: "0.85rem",
                  opacity: 1,
                },
              },
              "& fieldset": {
                borderColor: "#e5e7eb",
                borderWidth: "1.5px",
                borderRadius: "10px",
              },
              "&:hover fieldset": {
                borderColor: "#9ca3af",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#16a34a",
                borderWidth: "1.5px",
                boxShadow: "0 0 0 3px rgba(22, 163, 74, 0.1)",
              },
            },
          }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? (
                  <CircularProgress
                    size={14}
                    sx={{ color: "#6b7280", mr: 0.5 }}
                  />
                ) : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

export default SearchableCreatableSelect;
