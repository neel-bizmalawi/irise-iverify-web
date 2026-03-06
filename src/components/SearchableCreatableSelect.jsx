import React, { useState } from "react";
import {
  Autocomplete,
  TextField,
  CircularProgress,
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
            .includes(params.inputValue.toLowerCase())
        );

        if (
          allowCreate &&
          params.inputValue !== "" &&
          !options.some(
            (opt) =>
              opt[labelKey].toLowerCase() ===
              params.inputValue.toLowerCase()
          )
        ) {
          filtered.push({
            inputValue: params.inputValue,
            [labelKey]: `Add "${params.inputValue}"`,
          });
        }

        return filtered;
      }}
      renderInput={(params) => (
        <TextField
          sx={{
            "& .MuiOutlinedInput-root": {
              width: "187px",
              backgroundColor: "#ffffff",
              paddingBottom: 4,
              height: 47,
              borderRadius: "10px",
            }
          }}
          {...params}
          label={label}
          size="small"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={18} /> : null}
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