"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  Calculator,
  Loader2,
  FileCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  History,
  Send,
} from "lucide-react"

// --- Constants ---
const SHEET_ID = "19Za1BvjKvHT01rzDOPLS_MErnuEJd6__l7C_4lUgLlg"
const SHEET_NAME = "PO"
const DATA_START_ROW = 7
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3_COAFa1T6tCTjJT8Ip0ep7Qy83wA7ZpJteErgfzZ-gQG0Zf8Yxw6iTspQ5oGy6Q/exec"

// Column indices from Google Sheet (0-based)
const ColumnIndices = {
  ERP_PO_NUMBER: 1,    // Column B
  INDENT_NUMBER: 2,    // Column C
  MATERIAL_NAME: 3,    // Column D
  BROKER_NAME: 4,      // Column E
  PARTY_NAME: 5,       // Column F
  QTY: 6,              // Column G
  RATE: 7,             // Column H
  LEAD_TIME: 8,        // Column I
  PO_COPY: 9,          // Column J
  TRANSPORTING_TYPE: 10, // Column K
  FEM_PERCENT: 11,     // Column L
  YIELD_PERCENT: 12,   // Column M
  COLUMN_N: 13,        // Column N
  TIMESTAMP: 14,       // Column O
  STATUS: 16,          // Column Q
}

// --- Helper Functions ---
const formatSheetDateString = (dateValue) => {
  if (!dateValue || typeof dateValue !== "string" || !dateValue.trim()) {
    return ""
  }
  const dateObj = new Date(dateValue)
  if (isNaN(dateObj.getTime())) {
    return dateValue
  }
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(dateObj)
}

// --- React Component ---
export default function TallyEntry() {
  const [sheetData, setSheetData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [activeTab, setActiveTab] = useState("pending")
  const [selectedRows, setSelectedRows] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchSheetData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}&range=A7:Q1000&t=${new Date().getTime()}`

      const response = await fetch(url)
      if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`)

      const text = await response.text()
      const jsonString = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1)
      const data = JSON.parse(jsonString)

      if (data.status === "error") {
        throw new Error(data.errors.map((e) => e.detailed_message).join(", "))
      }

      const parsedData = (data.table.rows || [])
        .map((row, index) => {
          const rowData = {
            _rowIndex: index + DATA_START_ROW,
            rawCells: row.c.map((cell) => (cell ? (cell.f ?? cell.v) : null)),
          }

          const getCell = (colIdx) => rowData.rawCells[colIdx] || ""

          return {
            ...rowData,
            _id: `${SHEET_NAME}-${rowData._rowIndex}-${getCell(ColumnIndices.ERP_PO_NUMBER)}`,
            erpPoNumber: String(getCell(ColumnIndices.ERP_PO_NUMBER)),
            indentNumber: String(getCell(ColumnIndices.INDENT_NUMBER)),
            materialName: String(getCell(ColumnIndices.MATERIAL_NAME)),
            brokerName: String(getCell(ColumnIndices.BROKER_NAME)),
            partyName: String(getCell(ColumnIndices.PARTY_NAME)),
            qty: String(getCell(ColumnIndices.QTY)),
            rate: String(getCell(ColumnIndices.RATE)),
            leadTime: String(getCell(ColumnIndices.LEAD_TIME)),
            poCopy: String(getCell(ColumnIndices.PO_COPY)),
            transportingType: String(getCell(ColumnIndices.TRANSPORTING_TYPE)),
            femPercent: String(getCell(ColumnIndices.FEM_PERCENT)),
            yieldPercent: String(getCell(ColumnIndices.YIELD_PERCENT)),
            columnN: String(getCell(ColumnIndices.COLUMN_N)),
            timestamp: formatSheetDateString(getCell(ColumnIndices.TIMESTAMP)),
            status: String(getCell(ColumnIndices.STATUS)),
          }
        })
        .filter((row) => row.erpPoNumber && row.erpPoNumber.trim() !== "")

      setSheetData(parsedData)
    } catch (err) {
      console.error("Fetch Error:", err)
      const errorMessage = `Failed to load data. ${err.message}`
      setError(errorMessage)
      toast.error("Data Load Error", { description: errorMessage, icon: <XCircle className="h-4 w-4" /> })
    } finally {
      setLoading(false)
    }
  }, [refreshTrigger])

  useEffect(() => {
    fetchSheetData()
  }, [fetchSheetData])

  const { pendingEntries, historyEntries } = useMemo(() => {
    const pending = []
    const history = []

    sheetData.forEach((row) => {
      const hasColumnN = row.columnN && row.columnN.trim() !== ""
      const hasTimestamp = row.timestamp && row.timestamp.trim() !== ""

      if (hasColumnN && !hasTimestamp) {
        pending.push(row)
      } else if (hasColumnN && hasTimestamp) {
        history.push(row)
      }
    })

    // Sort history by latest timestamp first
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return {
      pendingEntries: pending,
      historyEntries: history,
    }
  }, [sheetData])

  const handleRowSelection = (rowId, checked) => {
    setSelectedRows(prev => {
      if (checked) {
        return { ...prev, [rowId]: { status: "Select" } }
      } else {
        const newSelected = { ...prev }
        delete newSelected[rowId]
        return newSelected
      }
    })
  }

  const handleStatusChange = (rowId, status) => {
    setSelectedRows(prev => ({
      ...prev,
      [rowId]: { ...prev[rowId], status }
    }))
  }

  const updateSheetWithData = async (entries) => {
    const timestamp = new Date()
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(/,/g, "")

    for (const entry of entries) {
      const selectedData = selectedRows[entry._id]
      if (!selectedData || selectedData.status === "Select") continue

      const updatedRowData = [...entry.rawCells]
      updatedRowData[ColumnIndices.TIMESTAMP] = timestamp
      updatedRowData[ColumnIndices.STATUS] = selectedData.status

      const params = new URLSearchParams({
        action: "update",
        sheetName: SHEET_NAME,
        rowIndex: entry._rowIndex.toString(),
        rowData: JSON.stringify(updatedRowData),
      })

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server error: ${response.status}. ${errorText}`)
      }

      const result = await response.json()
      if (result.status !== "success" && !result.success) {
        throw new Error(result.message || "The script indicated a failure.")
      }
    }

    return { success: true }
  }

  const handleSubmit = async () => {
    const selectedEntries = pendingEntries.filter(entry => 
      selectedRows[entry._id] && selectedRows[entry._id].status !== "Select"
    )

    if (selectedEntries.length === 0) {
      toast.error("No entries selected", {
        description: "Please select at least one entry with a valid status.",
        icon: <AlertTriangle className="h-4 w-4" />
      })
      return
    }

    setIsSubmitting(true)
    try {
      await updateSheetWithData(selectedEntries)
      
      toast.success("Entries Updated Successfully", {
        description: `${selectedEntries.length} entries have been processed.`,
        icon: <CheckCircle className="h-4 w-4" />
      })
      
      setSelectedRows({})
      setRefreshTrigger(t => t + 1)
    } catch (error) {
      console.error("Update Failed:", error)
      toast.error("Update Failed", {
        description: `Could not update entries. Reason: ${error.message}`,
        icon: <XCircle className="h-4 w-4" />
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderCellContent = (content, { isLink, linkText } = {}) => {
    if (isLink) {
      const link = String(content || "").trim()
      if (link && link !== "-") {
        const fullLink = link.startsWith("http") ? link : `https://${link}`
        return (
          <a
            href={fullLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {linkText || "View"}
          </a>
        )
      }
      return <span className="text-muted-foreground">-</span>
    }
    return String(content || "").trim() || <span className="text-muted-foreground">-</span>
  }

  const renderPendingTable = () => {
    return (
      <Card className="shadow-none border flex-1 flex flex-col">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center text-lg">
                <FileCheck className="h-5 w-5 text-primary mr-2" /> 
                Pending PO Entries ({pendingEntries.length})
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Select entries to update their status
              </CardDescription>
            </div>
            {Object.keys(selectedRows).length > 0 && (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit ({Object.keys(selectedRows).length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          {loading && pendingEntries.length === 0 ? (
            <div className="flex flex-1 items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              Loading...
            </div>
          ) : error && pendingEntries.length === 0 ? (
            <div className="m-4 p-6 flex flex-1 flex-col items-center justify-center text-center bg-destructive/10 border border-dashed border-destructive rounded-lg">
              <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
              <p className="font-semibold text-destructive">Error Loading Data</p>
              <p className="text-sm text-muted-foreground max-w-md mt-1">{error}</p>
            </div>
          ) : pendingEntries.length === 0 ? (
            <div className="m-4 p-6 flex flex-1 flex-col items-center justify-center text-center bg-secondary/50 border border-dashed rounded-lg">
              <Info className="h-10 w-10 text-primary mb-3" />
              <p className="font-semibold">No Pending Entries</p>
              <p className="text-sm text-muted-foreground mt-1">
                All eligible entries have been processed.
              </p>
            </div>
          ) : (
            <div className="overflow-auto h-full">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                  <TableRow>
                    <TableHead className="w-[80px] text-center">Select</TableHead>
                    <TableHead>ERP PO Number</TableHead>
                    <TableHead>Indent Number</TableHead>
                    <TableHead>Material Name</TableHead>
                    <TableHead>Broker Name</TableHead>
                    <TableHead>Party Name</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>PO Copy</TableHead>
                    <TableHead>Transporting Type</TableHead>
                    <TableHead>FEM %</TableHead>
                    <TableHead>Yield %</TableHead>
                    <TableHead className="w-[150px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingEntries.map((entry) => (
                    <TableRow key={entry._id} className="hover:bg-muted/50">
                      <TableCell className="text-center">
                        <Checkbox
                          checked={!!selectedRows[entry._id]}
                          onCheckedChange={(checked) => handleRowSelection(entry._id, checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-blue-600">{entry.erpPoNumber}</TableCell>
                      <TableCell>{entry.indentNumber}</TableCell>
                      <TableCell>{entry.materialName}</TableCell>
                      <TableCell>{entry.brokerName}</TableCell>
                      <TableCell>{entry.partyName}</TableCell>
                      <TableCell>{entry.qty}</TableCell>
                      <TableCell>{entry.rate}</TableCell>
                      <TableCell>{entry.leadTime}</TableCell>
                      <TableCell>
                        {renderCellContent(entry.poCopy, { isLink: true, linkText: "View PO" })}
                      </TableCell>
                      <TableCell>{entry.transportingType}</TableCell>
                      <TableCell>{entry.femPercent}%</TableCell>
                      <TableCell>{entry.yieldPercent}%</TableCell>
                      <TableCell>
                        {selectedRows[entry._id] ? (
                          <Select
                            value={selectedRows[entry._id].status}
                            onValueChange={(value) => handleStatusChange(entry._id, value)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Select" disabled>Select</SelectItem>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not selected</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderHistoryTable = () => {
    return (
      <Card className="shadow-none border flex-1 flex flex-col">
        <CardHeader className="py-3 px-4 border-b">
          <div>
            <CardTitle className="flex items-center text-lg">
              <History className="h-5 w-5 text-primary mr-2" /> 
              PO History ({historyEntries.length})
            </CardTitle>
            <CardDescription className="mt-1 text-sm">
              Completed PO entries with their status
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          {loading && historyEntries.length === 0 ? (
            <div className="flex flex-1 items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              Loading...
            </div>
          ) : historyEntries.length === 0 ? (
            <div className="m-4 p-6 flex flex-1 flex-col items-center justify-center text-center bg-secondary/50 border border-dashed rounded-lg">
              <Info className="h-10 w-10 text-primary mb-3" />
              <p className="font-semibold">No History Found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Completed entries will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-auto h-full">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                  <TableRow>
                    <TableHead>ERP PO Number</TableHead>
                    <TableHead>Indent Number</TableHead>
                    <TableHead>Material Name</TableHead>
                    <TableHead>Broker Name</TableHead>
                    <TableHead>Party Name</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>PO Copy</TableHead>
                    <TableHead>Transporting Type</TableHead>
                    <TableHead>FEM %</TableHead>
                    <TableHead>Yield %</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyEntries.map((entry) => (
                    <TableRow key={entry._id} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-blue-600">{entry.erpPoNumber}</TableCell>
                      <TableCell>{entry.indentNumber}</TableCell>
                      <TableCell>{entry.materialName}</TableCell>
                      <TableCell>{entry.brokerName}</TableCell>
                      <TableCell>{entry.partyName}</TableCell>
                      <TableCell>{entry.qty}</TableCell>
                      <TableCell>{entry.rate}</TableCell>
                      <TableCell>{entry.leadTime}</TableCell>
                      <TableCell>
                        {renderCellContent(entry.poCopy, { isLink: true, linkText: "View PO" })}
                      </TableCell>
                      <TableCell>{entry.transportingType}</TableCell>
                      <TableCell>{entry.femPercent}%</TableCell>
                      <TableCell>{entry.yieldPercent}%</TableCell>
                      <TableCell>
                        <Badge variant={entry.status === "Yes" ? "default" : "secondary"}>
                          {entry.status || "Unknown"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col bg-background">
      <Card className="shadow-md border-none flex-1 flex flex-col">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
          <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <Calculator className="h-7 w-7 text-blue-600" />
            Purchase Order Management
          </CardTitle>
          <CardDescription className="text-gray-600 mt-1">
            Manage and track purchase order entries in the system.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mb-4">
              <TabsTrigger value="pending" className="gap-2">
                <FileCheck className="h-4 w-4" /> Pending{" "}
                <Badge variant="secondary" className="ml-2">
                  {pendingEntries.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" /> History{" "}
                <Badge variant="secondary" className="ml-2">
                  {historyEntries.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="flex-1 mt-0">
              {renderPendingTable()}
            </TabsContent>
            
            <TabsContent value="history" className="flex-1 mt-0">
              {renderHistoryTable()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}