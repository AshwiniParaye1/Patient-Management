// app/file/[id]/page.tsx

"use client";

import AddPatientDialog from "@/app/components/AddPatientDialog";
import { NewPatient, Sheet } from "@/types/sheet";
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
import React, { useEffect, useState } from "react";
import {
  deleteSheetRow,
  fetchSheetData,
  getAvailableSheets,
  updateSheetRow
} from "./googleSheetsApi";

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
  const [availableSheets, setAvailableSheets] = useState<Sheet[]>([]);

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
  const [newPatient, setNewPatient] = useState<NewPatient>({
    patientId: "Auto Generate",
    firstName: "",
    lastName: "",
    location: "",
    age: "",
    phone: "",
    address: "",
    email: "",
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
    if (editRowIndex === null || !id || !session?.accessToken || !activeSheet)
      return;

    try {
      // Calculate the actual row index in the sheet (starting from 2 because of header)
      const actualRowIndex = editRowIndex + 2;

      const newSheetData = [...sheetData];
      newSheetData[actualRowIndex - 1] = editValues;
      setSheetData(newSheetData);

      // API call to update the row
      await updateSheetRow(
        session.accessToken,
        id.toString(),
        activeSheet,
        actualRowIndex,
        editValues
      );

      setNotification({
        open: true,
        message: "Row updated successfully",
        type: "success"
      });

      handleEditDialogClose();

      // Refresh data to ensure we have the latest data
      await handleRefresh();
    } catch (error: any) {
      console.error("Error updating row:", error);
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
      email: "",
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

  const handleNewPatientChange = (field: keyof NewPatient, value: string) => {
    setNewPatient({
      ...newPatient,
      [field]: value
    });
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
                <button
                  onClick={handleEditDialogClose}
                  className="px-4 py-2 mr-4 bg-white border text-black rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  className="px-4 py-2 mr-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Save
                </button>
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
                <button
                  onClick={() => setDeleteDialogOpen(false)}
                  className="px-4 py-2 mr-4 bg-white border text-black rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  color="error"
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 mr-4 bg-red-500 border text-white rounded-lg hover:bg-red-400 transition-colors"
                >
                  Delete
                </button>
              </DialogActions>
            </Dialog>

            {/* Add Patient Dialog */}
            <AddPatientDialog
              open={addDialogOpen}
              onClose={handleAddDialogClose}
              newPatient={newPatient}
              onNewPatientChange={handleNewPatientChange}
              setNotification={setNotification}
              accessToken={session?.accessToken}
              fileId={id?.toString()}
              handleRefresh={handleRefresh}
            />

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
