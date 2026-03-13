import React from "react";
import Breadcrumb from "../../components/Breadcrumb";

const Dashboard = () => {
  return (
    <div>
      <h1 style={{ margin: 0 }}>Dashboard</h1>

      <Breadcrumb homePath="/dashboard" homeLabel="Dashboard" />
      
       <div
  style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "40px", // reduce this if you want less top space
  }}
>
  <div
    style={{
      width: "650px",
      height: "220px",
      background: "linear-gradient(135deg, #1f5d35, #2f9b58)",
      borderRadius: "14px",
      color: "#fff",
      boxShadow: "0px 8px 20px rgba(0,0,0,0.15)",

      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
    }}
  >
    <h1
      style={{
        fontSize: "34px",
        fontWeight: 700,
        marginTop: 0,   // remove default top margin
        marginBottom: "10px",
      }}
    >
      Welcome to Your Dashboard!
    </h1>

    <p
      style={{
        fontSize: "16px",
        opacity: 0.9,
        margin: 0,
      }}
    >
      We're glad to have you back.
    </p>
  </div>
</div>

    </div>
  );
};

export default Dashboard;
