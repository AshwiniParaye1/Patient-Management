//app/file/[id]/page.tsx

"use client";

import type React from "react";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Typography
} from "@mui/material";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Function to fetch Google Sheets data
async function fetchSheetData(accessToken: string, fileId: string) {
  if (!accessToken) {
    throw new Error("No access token provided");
  }

  try {
    // First get spreadsheet metadata to find sheet IDs
    const metadataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${fileId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!metadataResponse.ok) {
      throw new Error(
        `Failed to get spreadsheet metadata: ${metadataResponse.status}`
      );
    }

    const metadata = await metadataResponse.json();
    console.log("metadata", metadata);
    const firstSheetId = metadata.sheets[2].properties.title;

    // Now get the actual data from the first sheet
    const dataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${firstSheetId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!dataResponse.ok) {
      throw new Error(`Failed to get sheet data: ${dataResponse.status}`);
    }

    const data = await dataResponse.json();
    console.log("data", data);
    return data.values;
  } catch (error) {
    console.error("Error fetching Google Sheet data:", error);
    throw error;
  }
}

// Function to delete a row from Google Sheets
async function deleteSheetRow(
  accessToken: string,
  fileId: string,
  sheetTitle: string,
  rowIndex: number
) {
  if (!accessToken) {
    throw new Error("No access token provided");
  }

  try {
    // Get the actual sheet ID from metadata first
    const metadataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${fileId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!metadataResponse.ok) {
      throw new Error(
        `Failed to get spreadsheet metadata: ${metadataResponse.status}`
      );
    }

    const metadata = await metadataResponse.json();
    // Find the sheet with the matching title
    const sheetId = metadata.sheets[2].properties.sheetId;

    // Google Sheets API requires batch update for row deletion
    const request = {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1 // End index is exclusive
            }
          }
        }
      ]
    };

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${fileId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request)
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Google Sheets API error:", errorData);
      throw new Error(`Failed to delete row: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting row from Google Sheet:", error);
    throw error;
  }
}

// Function to add a new row to Google Sheets
async function addSheetRow(
  accessToken: string,
  fileId: string,
  sheetTitle: string,
  rowData: string[]
) {
  if (!accessToken) {
    throw new Error("No access token provided");
  }

  try {
    // Append the row to the sheet
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${sheetTitle}:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          values: [rowData]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Google Sheets API error:", errorData);
      throw new Error(`Failed to add row: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error adding row to Google Sheet:", error);
    throw error;
  }
}

export default function FilePage() {
  const params = useParams();
  const { id } = params;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sheetData, setSheetData] = useState<any[][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // State for edit functionality
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<string[]>([]);

  // State for delete functionality
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRowIndex, setDeleteRowIndex] = useState<number | null>(null);

  // State for row actions menu
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  // State for add patient functionality
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    patientId: "Auto Generate",
    patientName: "",
    location: "",
    age: "",
    phone: "",
    address: "",
    prescription: "",
    dose: "",
    visitDate: "",
    nextVisit: "",
    physicianId: "",
    physicianName: "",
    physicianPhone: "",
    bill: ""
  });

  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    type: "success"
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Fetch the sheet data when session is available
  useEffect(() => {
    async function getSheetData() {
      if (!id) return;
      if (!session?.accessToken) return;
      console.log("id", id);
      try {
        setLoading(true);
        const data = await fetchSheetData(session.accessToken, id.toString());
        setSheetData(data);
        setError(null);
      } catch (err: any) {
        console.error("Error:", err);
        setError(err.message || "Failed to load spreadsheet data");
      } finally {
        setLoading(false);
      }
    }

    if (session?.accessToken) {
      getSheetData();
    }
  }, [session, id]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleRefresh = async () => {
    if (!id || !session?.accessToken) return;
    setRefreshing(true);
    try {
      const data = await fetchSheetData(session.accessToken, id.toString());
      setSheetData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  // Filter data based on search term
  const filteredData =
    sheetData.length > 1
      ? sheetData
          .slice(1)
          .filter((row) =>
            row.some((cell) =>
              cell.toString().toLowerCase().includes(search.toLowerCase())
            )
          )
      : [];

  // Action menu handlers
  const handleMenuOpen = (
    event: React.MouseEvent<HTMLButtonElement>,
    rowIndex: number
  ) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedRowIndex(rowIndex);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedRowIndex(null);
  };

  // Edit handlers
  const handleEditClick = (rowIndex: number) => {
    setEditRowIndex(rowIndex);
    setEditValues([...filteredData[rowIndex]]);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditRowIndex(null);
  };

  const handleEditInputChange = (index: number, value: string) => {
    const newValues = [...editValues];
    newValues[index] = value;
    setEditValues(newValues);
  };

  const handleEditSave = async () => {
    if (editRowIndex === null || !id || !session?.accessToken) return;

    try {
      // Calculate the actual row index in the sheet (header + 1-based index)
      const actualRowIndex = sheetData.indexOf(filteredData[editRowIndex]) + 1;
      const sheetTitle = sheetData[0][2].properties?.title || "Sheet1"; // Use the first sheet or default

      // Create a range string like "A5:Z5" for the row
      const rangeStart = "A" + (actualRowIndex + 1); // +1 for header row
      const rangeEnd =
        String.fromCharCode(65 + editValues.length - 1) + (actualRowIndex + 1);
      const range = `${rangeStart}:${rangeEnd}`;

      // await updateSheetData(
      //   session.accessToken,
      //   id.toString(),
      //   sheetTitle,
      //   range,
      //   editValues
      // );

      // Update local data
      const newSheetData = [...sheetData];
      newSheetData[actualRowIndex] = editValues;
      setSheetData(newSheetData);

      setNotification({
        open: true,
        message: "Row updated successfully",
        type: "success"
      });

      handleEditDialogClose();
    } catch (error: any) {
      setNotification({
        open: true,
        message: `Failed to update: ${error.message}`,
        type: "error"
      });
    }
  };

  // Delete handlers
  const handleDeleteClick = (rowIndex: number) => {
    setDeleteRowIndex(rowIndex);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setDeleteRowIndex(null);
  };

  const handleDeleteConfirm = async () => {
    if (deleteRowIndex === null || !id || !session?.accessToken) return;

    try {
      const actualRowIndex =
        sheetData.indexOf(filteredData[deleteRowIndex]) + 1;
      const metadataResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${id}`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json"
          }
        }
      );

      const metadata = await metadataResponse.json();
      const sheetTitle = metadata.sheets[2].properties.title;

      await deleteSheetRow(
        session.accessToken,
        id.toString(),
        sheetTitle,
        actualRowIndex
      );

      setNotification({
        open: true,
        message: "Row deleted successfully",
        type: "success"
      });

      // Refresh the sheetData immediately
      const updatedData = await fetchSheetData(
        session.accessToken,
        id.toString()
      );
      setSheetData(updatedData);
    } catch (err: any) {
      console.error("Delete row error:", err);
      setNotification({
        open: true,
        message: err.message || "Failed to delete row",
        type: "error"
      });
    } finally {
      setDeleteRowIndex(null);
      setDeleteDialogOpen(false);
    }
  };

  // Add patient handlers
  const handleAddClick = () => {
    setAddDialogOpen(true);
  };

  const handleAddDialogClose = () => {
    setAddDialogOpen(false);
    // Reset form
    setNewPatient({
      patientId: "Auto Generate",
      patientName: "",
      location: "",
      age: "",
      phone: "",
      address: "",
      prescription: "",
      dose: "",
      visitDate: "",
      nextVisit: "",
      physicianId: "",
      physicianName: "",
      physicianPhone: "",
      bill: ""
    });
  };

  const handleNewPatientChange = (field: string, value: string) => {
    setNewPatient({
      ...newPatient,
      [field]: value
    });
  };

  const handleAddPatient = async () => {
    if (!id || !session?.accessToken) return;

    try {
      // Get sheet title
      const metadataResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${id}`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json"
          }
        }
      );

      const metadata = await metadataResponse.json();
      const sheetTitle = metadata.sheets[2].properties.title;

      // Generate a random ID if auto-generate is selected
      const patientId =
        newPatient.patientId === "Auto Generate"
          ? `P${Math.floor(Math.random() * 10000)
              .toString()
              .padStart(4, "0")}`
          : newPatient.patientId;

      // Create row data array in the same order as the sheet
      const rowData = [
        patientId,
        newPatient.patientName,
        newPatient.location,
        newPatient.age,
        newPatient.phone,
        newPatient.address,
        newPatient.prescription,
        newPatient.dose,
        newPatient.visitDate,
        newPatient.nextVisit,
        newPatient.physicianId,
        newPatient.physicianName,
        newPatient.physicianPhone,
        newPatient.bill
      ];

      // Add the row to the sheet
      await addSheetRow(
        session.accessToken,
        id.toString(),
        sheetTitle,
        rowData
      );

      setNotification({
        open: true,
        message: "Patient added successfully",
        type: "success"
      });

      // Refresh the data
      const updatedData = await fetchSheetData(
        session.accessToken,
        id.toString()
      );
      setSheetData(updatedData);
      handleAddDialogClose();
    } catch (error: any) {
      setNotification({
        open: true,
        message: `Failed to add patient: ${error.message}`,
        type: "error"
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  if (status === "loading" || loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
        >
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Loading spreadsheet data...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          onClick={() => router.push("/drive")}
          sx={{ mt: 2 }}
        >
          Return to Drive
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Box
          sx={{
            p: 3,
            borderBottom: "1px solid #eaeaea",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "stretch", md: "center" },
            gap: 2,
            justifyContent: "space-between"
          }}
        >
          <Typography variant="h4" component="h1" fontWeight="bold">
            Spreadsheet Data
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexDirection: { xs: "column", sm: "row" },
              width: { xs: "100%", md: "auto" }
            }}
          >
            <TextField
              placeholder="Search data..."
              size="small"
              variant="outlined"
              value={search}
              onChange={handleSearch}
              sx={{ minWidth: { sm: 250 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                sx={{ whiteSpace: "nowrap" }}
                onClick={handleAddClick}
              >
                Add Row
              </Button>
              <IconButton
                onClick={handleRefresh}
                disabled={refreshing}
                color="primary"
              >
                <RefreshIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {sheetData.length > 0 ? (
          <>
            <Box
              sx={{
                p: 2,
                borderBottom: "1px solid #eaeaea",
                bgcolor: "#f9f9f9"
              }}
            >
              <Chip
                label={`${filteredData.length} ${
                  filteredData.length === 1 ? "row" : "rows"
                }`}
                size="small"
                sx={{ mr: 1 }}
              />
              {search && (
                <Chip
                  label={`Search: "${search}"`}
                  size="small"
                  onDelete={() => setSearch("")}
                />
              )}
            </Box>
            <Box sx={{ overflowX: "auto" }}>
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {sheetData[0]?.map((cell, index) => (
                      <th
                        key={index}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                      >
                        {cell}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100"
                        >
                          {cell}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 text-right">
                        <IconButton
                          size="small"
                          aria-label="more"
                          onClick={(e) => handleMenuOpen(e, rowIndex)}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>

            {/* Row actions menu */}
            <Menu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem
                onClick={() =>
                  selectedRowIndex !== null && handleEditClick(selectedRowIndex)
                }
              >
                <EditIcon fontSize="small" sx={{ mr: 1 }} />
                Edit
              </MenuItem>
              <MenuItem
                onClick={() =>
                  selectedRowIndex !== null &&
                  handleDeleteClick(selectedRowIndex)
                }
              >
                <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                Delete
              </MenuItem>
            </Menu>

            {/* Edit Dialog */}
            <Dialog
              open={editDialogOpen}
              onClose={handleEditDialogClose}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>Edit Row</DialogTitle>
              <DialogContent>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    pt: 1
                  }}
                >
                  {editValues.map((value, index) => (
                    <TextField
                      key={index}
                      label={sheetData[0][index] || `Field ${index + 1}`}
                      value={value}
                      onChange={(e) =>
                        handleEditInputChange(index, e.target.value)
                      }
                      fullWidth
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleEditDialogClose}>Cancel</Button>
                <Button
                  onClick={handleEditSave}
                  variant="contained"
                  color="primary"
                >
                  Save
                </Button>
              </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  Are you sure you want to delete this row? This action cannot
                  be undone.
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button color="error" onClick={handleDeleteConfirm}>
                  Delete
                </Button>
              </DialogActions>
            </Dialog>

            {/* Add Patient Dialog */}
            <Dialog
              open={addDialogOpen}
              onClose={handleAddDialogClose}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>
                <Typography variant="h5" component="div" fontWeight="bold">
                  Add Patient
                </Typography>
              </DialogTitle>
              <DialogContent>
                <Box sx={{ mt: 2 }}>
                  {/* First row */}
                  <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Patient ID
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={newPatient.patientId}
                        onChange={(e) =>
                          handleNewPatientChange("patientId", e.target.value)
                        }
                        disabled={newPatient.patientId === "Auto Generate"}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px"
                          }
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Patient Name (First, Last Name)
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={newPatient.patientName}
                        onChange={(e) =>
                          handleNewPatientChange("patientName", e.target.value)
                        }
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px"
                          }
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Location
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={newPatient.location}
                        onChange={(e) =>
                          handleNewPatientChange("location", e.target.value)
                        }
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px"
                          }
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Second row */}
                  <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Age
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={newPatient.age}
                        onChange={(e) =>
                          handleNewPatientChange("age", e.target.value)
                        }
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px"
                          }
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Phone
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={newPatient.phone}
                        onChange={(e) =>
                          handleNewPatientChange("phone", e.target.value)
                        }
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px"
                          }
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Address
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={newPatient.address}
                        onChange={(e) =>
                          handleNewPatientChange("address", e.target.value)
                        }
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px"
                          }
                        }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ height: "1px", bgcolor: "#e0e0e0", my: 3 }} />

                  {/* Third row */}
                  <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Prescription
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={newPatient.prescription}
                        onChange={(e) =>
                          handleNewPatientChange("prescription", e.target.value)
                        }
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px"
                          }
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Dose
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={newPatient.dose}
                        onChange={(e) =>
                          handleNewPatientChange("dose", e.target.value)
                        }
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px"
                          }
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Fourth row */}
                  <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Visit Date
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        type="date"
                        value={newPatient.visitDate}
                        onChange={(e) =>
                          handleNewPatientChange("visitDate", e.target.value)
                        }
                        InputLabelProps={{
                          shrink: true
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px"
                          }
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Next Visit
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        type="date"
                        value={newPatient.nextVisit}
                        onChange={(e) =>
                          handleNewPatientChange("nextVisit", e.target.value)
                        }
                        InputLabelProps={{
                          shrink: true
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px"
                          }
                        }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ height: "1px", bgcolor: "#e0e0e0", my: 3 }} />

                  {/* Fifth row */}
                  <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Physician ID
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={newPatient.physicianId}
                        onChange={(e) =>
                          handleNewPatientChange("physicianId", e.target.value)
                        }
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px"
                          }
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Physician Name (First, Last Name)
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={newPatient.physicianName}
                        onChange={(e) =>
                          handleNewPatientChange(
                            "physicianName",
                            e.target.value
                          )
                        }
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px"
                          }
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Sixth row */}
                  <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Phone
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={newPatient.physicianPhone}
                        onChange={(e) =>
                          handleNewPatientChange(
                            "physicianPhone",
                            e.target.value
                          )
                        }
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px"
                          }
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Bill
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={newPatient.bill}
                        onChange={(e) =>
                          handleNewPatientChange("bill", e.target.value)
                        }
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px"
                          }
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleAddDialogClose}>Cancel</Button>
                <Button
                  onClick={handleAddPatient}
                  variant="contained"
                  color="primary"
                >
                  Add Patient
                </Button>
              </DialogActions>
            </Dialog>

            {/* Empty state handling */}
            {filteredData.length === 0 && search && (
              <Box sx={{ p: 8, textAlign: "center" }}>
                <Typography color="text.secondary">
                  No matching data found. Try a different search term.
                </Typography>
                <Button
                  variant="text"
                  onClick={() => setSearch("")}
                  sx={{ mt: 2 }}
                >
                  Clear Search
                </Button>
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ p: 8, textAlign: "center" }}>
            <Typography color="text.secondary" paragraph>
              No data found in this spreadsheet.
            </Typography>
            <Button variant="outlined" onClick={handleRefresh}>
              Refresh Data
            </Button>
          </Box>
        )}
      </Paper>

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        message={notification.message}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Container>
  );
}
