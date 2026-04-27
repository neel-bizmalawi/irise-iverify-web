import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  CircularProgress,
  Link,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  PersonOutline,
  LockOutlined,
} from "@mui/icons-material";
import eStove from "../../assets/images/eStoveLogin.png";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../../config";

export default function Login() {
  const navigate = useNavigate();

  const [showPass, setShowPass] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) return;

    try {
      setLoading(true);

      const response = await axios.post(`${API_BASE_URL}/auth/verifyUser`, {
        validemail: username,
        validPass: password,
      });

      const { AccessTokenss, user } = response.data;

      localStorage.setItem("token", AccessTokenss);
      localStorage.setItem("userName", user?.name || username);
      localStorage.setItem("role", user?.role);

      toast.success("Login successful!");

      navigate("/");
    } catch (error) {
      console.error("Login error:", error);

      toast.error(
        error.response?.data?.message || "Invalid username or password",
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyles = {
    borderRadius: 2,
    background: alpha("#fff", 0.08),
    color: "#fff",

    "& fieldset": {
      borderColor: "rgba(255,255,255,0.3)",
    },
    "&:hover fieldset": {
      borderColor: "#fff",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#fff",
    },

    /* Autofill Fix */
    "& input:-webkit-autofill": {
      WebkitTextFillColor: "#fff",
      caretColor: "#fff",
      transition: "background-color 9999s ease-in-out 0s",
    },
  };

  return (
    <Box
      sx={{
        height: "100dvh",
        boxSizing: "border-box",
        overflow: "hidden",
        background:
          "linear-gradient(160deg, #2e7d32 0%, #1b5e20 40%, #0f3d17 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: 5,
          borderRadius: 4,
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* Logo */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Box
            component="img"
            src={eStove}
            alt="eStove logo"
            sx={{
              height: 70,
              width: "auto",
              maxWidth: 180,
              objectFit: "contain",
              display: "block",
              margin: "0 auto",
            }}
          />
          <Typography sx={{ color: "#c8e6c9", fontSize: 14, mt: 1 }}>
            Welcome Back! Please enter your details.
          </Typography>
        </Box>

        {/* Username */}
        <TextField
          fullWidth
          placeholder="Enter Your Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          sx={{
            mb: 3,
            "& .MuiOutlinedInput-root": inputStyles,
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonOutline sx={{ color: "#e8f5e9" }} />
              </InputAdornment>
            ),
          }}
        />

        {/* Password */}
        <TextField
          fullWidth
          type={showPass ? "text" : "password"}
          placeholder="Enter Your Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLogin();
          }}
          sx={{
            mb: 3,
            "& .MuiOutlinedInput-root": inputStyles,
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlined sx={{ color: "#e8f5e9" }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPass(!showPass)}>
                  {showPass ? (
                    <VisibilityOff sx={{ color: "#fff" }} />
                  ) : (
                    <Visibility sx={{ color: "#fff" }} />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Forgot */}
        <Box sx={{ textAlign: "right", mb: 3 }}>
          <Link
            href="#"
            underline="none"
            sx={{ color: "#c8e6c9", fontSize: 13 }}
          >
            Forgot Password?
          </Link>
        </Box>

        {/* Button */}
        <Button
          fullWidth
          variant="contained"
          onClick={handleLogin}
          disabled={loading}
          sx={{
            height: 48,
            borderRadius: 2,
            fontWeight: 600,
            background: "#fff",
            color: "#1b5e20",
            "&:hover": {
              background: "#f1f8e9",
            },
          }}
        >
          {loading ? (
            <CircularProgress size={20} sx={{ color: "#1b5e20" }} />
          ) : (
            "Sign In"
          )}
        </Button>
      </Paper>
    </Box>
  );
}
