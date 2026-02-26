import React from "react";
import Breadcrumb from "../../components/Breadcrumb";

const Dashboard = () => {
  return (
    <div>
      <h1 style={{ margin: 0 }}>Dashboard</h1>

      <Breadcrumb homePath="/dashboard" homeLabel="Dashboard" />
    </div>
  );
};

export default Dashboard;
