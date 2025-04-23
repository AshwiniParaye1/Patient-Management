//app/file/[id]/page.tsx

"use client";

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
import type React from "react";
import { useEffect, useState } from "react";

// Function to get available sheets in the spreadsheet
async function getAvailableSheets(accessToken: string, fileId: string) {
  if (!accessToken) {
    throw new Error("No access token provided");
  }

  try {
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
    return metadata.sheets.map((sheet: any) => ({
      id: sheet.properties.sheetId,
      title: sheet.properties.title
    }));
  } catch (error) {
    console.error("Error fetching Google Sheets metadata:", error);
    throw error;
  }
}

// Function to fetch Google Sheets data
async function fetchSheetData(
  accessToken: string,
  fileId: string,
  sheetTitle: string
) {
  if (!accessToken) {
    throw new Error("No access token provided");
  }

  try {
    const dataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${sheetTitle}`,
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
    return data.values;
  } catch (error) {
    console.error("Error fetching Google Sheet data:", error);
    throw error;
  }
}

// Function to add data to a specific sheet
async function addDataToSheet(
  accessToken: string,
  fileId: string,
  sheetName: string,
  rowData: string[]
) {
  if (!accessToken) {
    throw new Error("No access token provided");
  }

  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${sheetName}:append?valueInputOption=USER_ENTERED`,
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
      throw new Error(`Failed to add data to ${sheetName} sheet`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error adding data to ${sheetName} sheet:`, error);
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
    let sheetId = null;
    for (const sheet of metadata.sheets) {
      if (sheet.properties.title === sheetTitle) {
        sheetId = sheet.properties.sheetId;
        break;
      }
    }

    if (!sheetId) {
      throw new Error(`Could not find sheet with title: ${sheetTitle}`);
    }

    // Google Sheets API requires batch update for row deletion
    const request = {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1
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

// Function to generate unique IDs
function generateId(prefix: string) {
  return `${prefix}${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`;
}

// Function to format date as MM/DD/YY
function formatDate(date: string) {
  if (!date) return "";
  const d = new Date(date);
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d
    .getDate()
    .toString()
    .padStart(2, "0")}/${d.getFullYear().toString().slice(-2)}`;
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
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [availableSheets, setAvailableSheets] = useState<
    Array<{ id: number; title: string }>
  >([]);

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
    firstName: "",
    lastName: "",
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
    type: "success" as "success" | "error" | "info" | "warning"
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Get available sheets when session is available
  useEffect(() => {
    async function fetchSheets() {
      if (!id || !session?.accessToken) return;

      try {
        const sheets = await getAvailableSheets(
          session.accessToken,
          id.toString()
        );
        setAvailableSheets(sheets);
        // Set the active sheet to the patient sheet
        const patientSheet = sheets.find(
          (sheet: { id: number; title: string }) =>
            sheet.title.toLowerCase() === "patient"
        );

        if (patientSheet) {
          setActiveSheet(patientSheet.title);
        } else if (sheets.length > 0) {
          setActiveSheet(sheets[0].title);
        }
      } catch (err: any) {
        console.error("Error fetching sheets:", err);
        setError(err.message || "Failed to load spreadsheet sheets");
      }
    }

    if (session?.accessToken) {
      fetchSheets();
    }
  }, [session, id]);

  // Fetch the sheet data when session and activeSheet are available
  useEffect(() => {
    async function getSheetData() {
      if (!id || !session?.accessToken || !activeSheet) return;

      try {
        setLoading(true);
        const data = await fetchSheetData(
          session.accessToken,
          id.toString(),
          activeSheet
        );
        setSheetData(data || []);
        setError(null);
      } catch (err: any) {
        console.error("Error:", err);
        setError(err.message || "Failed to load spreadsheet data");
      } finally {
        setLoading(false);
      }
    }

    if (session?.accessToken && activeSheet) {
      getSheetData();
    }
  }, [session, id, activeSheet]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleRefresh = async () => {
    if (!id || !session?.accessToken || !activeSheet) return;
    setRefreshing(true);
    try {
      const data = await fetchSheetData(
        session.accessToken,
        id.toString(),
        activeSheet
      );
      setSheetData(data || []);
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
              cell?.toString().toLowerCase().includes(search.toLowerCase())
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
      // Calculate the actual row index in the sheet (header + filtered index + 1)
      const actualRowIndex = editRowIndex + 1;

      // Update local data first (optimistic update)
      const newSheetData = [...sheetData];
      newSheetData[actualRowIndex] = editValues;
      setSheetData(newSheetData);

      // Refresh data to ensure we have the latest
      await handleRefresh();

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
    if (deleteRowIndex === null || !id || !session?.accessToken || !activeSheet)
      return;

    try {
      // Calculate the actual row index by adding 1 to account for header row
      const actualRowIndex = deleteRowIndex + 1;

      // Delete the row from the sheet
      await deleteSheetRow(
        session.accessToken,
        id.toString(),
        activeSheet,
        actualRowIndex
      );

      // Update local state to remove the deleted row
      const newSheetData = [...sheetData];
      newSheetData.splice(actualRowIndex, 1);
      setSheetData(newSheetData);

      setNotification({
        open: true,
        message: "Row deleted successfully",
        type: "success"
      });

      // Refresh the sheetData immediately
      await handleRefresh();
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
    setNewPatient({
      patientId: "Auto Generate",
      firstName: "",
      lastName: "",
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
      // Generate IDs
      const patientId =
        newPatient.patientId === "Auto Generate"
          ? `a12kj${Math.floor(Math.random() * 1000)
              .toString()
              .padStart(3, "0")}`
          : newPatient.patientId;
      const appointmentId = generateId("ap");

      // 1. Add to patient sheet
      const patientData = [
        patientId, // ssn
        newPatient.firstName, // first_name
        newPatient.lastName, // last_name
        newPatient.address, // address
        newPatient.location, // location
        "", // email
        newPatient.phone, // phone
        "" // pcp
      ];
      await addDataToSheet(
        session.accessToken,
        id.toString(),
        "patient",
        patientData
      );

      // 2. Add to appointment sheet
      const appointmentData = [
        appointmentId, // appointmentID
        patientId, // patientID
        newPatient.physicianId, // physicianID
        formatDate(newPatient.visitDate), // start_dt_time
        formatDate(newPatient.nextVisit) // next_dt_time
      ];
      await addDataToSheet(
        session.accessToken,
        id.toString(),
        "appointment",
        appointmentData
      );

      // 3. Add to prescribes sheet
      const prescribesData = [
        newPatient.physicianId, // physician
        patientId, // PatientID
        newPatient.prescription, // description
        newPatient.dose // dose
      ];
      await addDataToSheet(
        session.accessToken,
        id.toString(),
        "prescribes",
        prescribesData
      );

      // 4. Add to physician sheet if new physician
      if (newPatient.physicianId && newPatient.physicianName) {
        const [physicianFirstName = "", physicianLastName = ""] =
          newPatient.physicianName.split(" ");
        const physicianData = [
          newPatient.physicianId, // employeeid
          `${physicianFirstName} ${physicianLastName}`, // name
          "Sr Doctor", // position
          newPatient.physicianPhone // phone
        ];
        await addDataToSheet(
          session.accessToken,
          id.toString(),
          "physician",
          physicianData
        );
      }

      setNotification({
        open: true,
        message: "Patient and related data added successfully",
        type: "success"
      });

      // Refresh the data
      await handleRefresh();
      handleAddDialogClose();
    } catch (error: any) {
      console.error("Error adding patient data:", error);
      setNotification({
        open: true,
        message: `Failed to add patient data: ${error.message}`,
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
            {activeSheet && (
              <Chip
                label={activeSheet}
                size="small"
                sx={{ ml: 2, verticalAlign: "middle" }}
              />
            )}
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
              <button
                color="primary"
                onClick={handleAddClick}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <AddIcon />
                Add Patient
              </button>
              <IconButton onClick={handleRefresh} disabled={refreshing}>
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
                        Patient First Name
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={newPatient.firstName}
                        onChange={(e) =>
                          handleNewPatientChange("firstName", e.target.value)
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
                        Patient Last Name
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={newPatient.lastName}
                        onChange={(e) =>
                          handleNewPatientChange("lastName", e.target.value)
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
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.type}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
