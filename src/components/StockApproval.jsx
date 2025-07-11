"use client"

import { useState, useEffect, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Loader2, AlertTriangle, Info, RefreshCw } from "lucide-react"

export default function IndentApproval() {
  const [indents, setIndents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("pending")
  const [refreshData, setRefreshData] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Form states for the popup
  const [selectedIndent, setSelectedIndent] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    indentNumber: "",
    indenterName: "",
    materialName: "",
    qty: "",
    status: "Select",
    approvedQty: "",
    remarks: "",
  })

  // Google Sheet configuration
  const scriptUrl =
    "https://script.google.com/macros/s/AKfycbx3_COAFa1T6tCTjJT8Ip0ep7Qy83wA7ZpJteErgfzZ-gQG0Zf8Yxw6iTspQ5oGy6Q/exec"
  const sheetId = "19Za1BvjKvHT01rzDOPLS_MErnuEJd6__l7C_4lUgLlg"
  const sheetName = "INDENT"

  // Fetch data from Google Sheets
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&range=A7:O1000`

        const response = await fetch(url, {
          mode: "cors",
          credentials: "omit",
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
        }

        const text = await response.text()

        // Extract JSON from the response
        const jsonStart = text.indexOf("{")
        const jsonEnd = text.lastIndexOf("}")

        if (jsonStart === -1 || jsonEnd === -1) {
          throw new Error("Invalid response format from Google Sheets")
        }

        const jsonString = text.substring(jsonStart, jsonEnd + 1)
        const data = JSON.parse(jsonString)

        if (!data.table || !data.table.rows) {
          setIndents([])
          setLoading(false)
          return
        }

        // Process the data starting from row 7
        const processedData = data.table.rows.map((row, index) => {
          const getCellValue = (cellIndex) => {
            const cell = row.c && row.c[cellIndex]
            return cell && cell.v !== null && cell.v !== undefined ? String(cell.v) : ""
          }

          return {
            id: `row-${index + 7}`,
            rowIndex: index + 7, // Actual row number in sheet
            indentNumber: getCellValue(1), // Column B
            indenterName: getCellValue(2), // Column C
            materialName: getCellValue(3), // Column D
            brokerName: getCellValue(4), // Column E
            qty: getCellValue(5), // Column F
            remarks: getCellValue(6), // Column G
            location: getCellValue(7), // Column H
            division: getCellValue(8), // Column I
            columnJ: getCellValue(9), // Column J
            columnK: getCellValue(10), // Column K
            status: getCellValue(12), // Column M
            remark: getCellValue(13), // Column N
            approvedQty: getCellValue(14), // Column O
          }
        })

        setIndents(processedData)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load data: " + err.message)
        toast.error("Failed to load data", {
          description: err.message,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [refreshData])

  // Handle refresh button click
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setRefreshData((prev) => !prev)
    // Wait for the loading to complete
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1000)
  }

  // Filter data for Pending tab (Column J not null, Column K null)
  const pendingIndents = useMemo(() => {
    const filtered = indents.filter(
      (indent) => indent.columnJ && indent.columnJ.trim() !== "" && (!indent.columnK || indent.columnK.trim() === ""),
    )

    if (!searchTerm.trim()) return filtered

    return filtered.filter(
      (indent) =>
        indent.indentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.indenterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.brokerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.division.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.remarks.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [indents, searchTerm])

  // Filter data for History tab (Column J not null, Column K not null)
  const historyIndents = useMemo(() => {
    const filtered = indents.filter(
      (indent) => indent.columnJ && indent.columnJ.trim() !== "" && indent.columnK && indent.columnK.trim() !== "",
    )

    if (!searchTerm.trim()) return filtered

    return filtered.filter(
      (indent) =>
        indent.indentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.indenterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.brokerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.remark.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.approvedQty.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [indents, searchTerm])

  // Handle opening the check dialog
  const handleCheckIndent = (indent) => {
    setSelectedIndent(indent)
    setFormData({
      indentNumber: indent.indentNumber,
      indenterName: indent.indenterName,
      materialName: indent.materialName,
      qty: indent.qty,
      status: "Select",
      approvedQty: "",
      remarks: "",
    })
    setIsDialogOpen(true)
  }

  // Handle form input changes
  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (formData.status === "Select") {
      toast.error("Please select a status")
      return
    }

    // Only require approved quantity when status is "Okay"
    if (formData.status === "Okay" && !formData.approvedQty.trim()) {
      toast.error("Please enter approved quantity")
      return
    }

    setIsSubmitting(true)

    try {
      // Create timestamp in DD/MM/YYYY format
      const now = new Date()
      const day = String(now.getDate()).padStart(2, "0")
      const month = String(now.getMonth() + 1).padStart(2, "0")
      const year = now.getFullYear()
      const timestamp = `${day}/${month}/${year}`

      // Prepare row data for update
      const rowData = new Array(15).fill("") // Initialize with empty strings for columns A-O
      rowData[10] = timestamp // Column K (index 10)
      rowData[12] = formData.status // Column M (index 12)
      rowData[13] = formData.remarks // Column N (index 13)
      rowData[14] = formData.approvedQty // Column O (index 14)

      // Create form data for the request
      const payload = new FormData()
      payload.append("action", "update")
      payload.append("sheetName", sheetName)
      payload.append("rowIndex", selectedIndent.rowIndex)
      payload.append("rowData", JSON.stringify(rowData))

      const response = await fetch(scriptUrl, {
        method: "POST",
        body: payload,
      })

      const result = await response.text()

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      // Try to parse as JSON, fallback to text
      let parsedResult
      try {
        parsedResult = JSON.parse(result)
      } catch {
        parsedResult = { success: result.includes("success"), message: result }
      }

      if (parsedResult.success || result.includes("success")) {
        toast.success("Indent updated successfully!")
        setIsDialogOpen(false)
        setRefreshData((prev) => !prev) // Trigger data refresh
      } else {
        throw new Error(parsedResult.message || "Update failed")
      }
    } catch (err) {
      console.error("Error submitting form:", err)
      toast.error("Failed to update indent", {
        description: err.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle dialog close
  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setSelectedIndent(null)
    setFormData({
      indentNumber: "",
      indenterName: "",
      materialName: "",
      qty: "",
      status: "Select",
      approvedQty: "",
      remarks: "",
    })
  }

  return (
    <div className="w-full max-w-full mx-auto bg-white min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 max-w-md mb-6 bg-white border-b border-gray-200 p-0 h-auto rounded-none">
            <TabsTrigger
              value="pending"
              className="px-6 py-3 text-base font-medium data-[state=active]:text-black data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=inactive]:text-gray-500 border-0 bg-transparent rounded-none shadow-none"
            >
              Pending
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="px-6 py-3 text-base font-medium data-[state=active]:text-black data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=inactive]:text-gray-500 border-0 bg-transparent rounded-none shadow-none"
            >
              History
            </TabsTrigger>
          </TabsList>

          {/* Search Bar and Refresh Button */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search by indent "
              className="max-w-md border-gray-300 rounded-md bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              className="flex items-center gap-2 px-4 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {/* Pending Tab */}
          <TabsContent value="pending" className="mt-0">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading pending indents...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center p-8 bg-red-50 rounded-lg">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-red-700 font-semibold text-lg">Error Loading Data</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={() => setRefreshData((p) => !p)} className="bg-red-600 hover:bg-red-700 text-white">
                  Try Again
                </Button>
              </div>
            ) : pendingIndents.length === 0 ? (
              <div className="text-center py-16">
                <Info className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No pending indents found</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-white">Indent Number</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-white">Indenter Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-white">Material Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-white">Broker Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-white">Qty</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-white">Remarks</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-white">Location</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-white">Division</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-white">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingIndents.map((indent) => (
                      <tr key={indent.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-900">{indent.indentNumber}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{indent.indenterName}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{indent.materialName}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{indent.brokerName}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{indent.qty}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{indent.remarks}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{indent.location}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{indent.division}</td>
                        <td className="px-4 py-4 text-sm">
                          <Button
                            onClick={() => handleCheckIndent(indent)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition-colors"
                          >
                            Check
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-0">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading history...</p>
                </div>
              </div>
            ) : historyIndents.length === 0 ? (
              <div className="text-center py-16">
                <Info className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No history records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-white">Indent Number</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-white">Indenter Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-white">Material Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-white">Broker Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-white">Approve Qty</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-white">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-white">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyIndents.map((indent) => (
                      <tr key={indent.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-900">{indent.indentNumber}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{indent.indenterName}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{indent.materialName}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{indent.brokerName}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{indent.approvedQty}</td>
                        <td className="px-4 py-4 text-sm">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${indent.status === "Okay"
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : indent.status === "Cancel"
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : "bg-gray-100 text-gray-800 border border-gray-200"
                              }`}
                          >
                            {indent.status || "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">{indent.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Check Indent Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] bg-white border border-gray-200 rounded-lg">
            <DialogHeader className="pb-4 border-b border-gray-200">
              <DialogTitle className="text-lg font-medium text-gray-900">Check Indent</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="indent-number" className="text-sm font-medium text-gray-700">
                    Indent Number
                  </Label>
                  <Input
                    id="indent-number"
                    value={formData.indentNumber}
                    disabled
                    className="bg-gray-50 border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="indenter-name" className="text-sm font-medium text-gray-700">
                    Indenter Name
                  </Label>
                  <Input
                    id="indenter-name"
                    value={formData.indenterName}
                    disabled
                    className="bg-gray-50 border-gray-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="material-name" className="text-sm font-medium text-gray-700">
                  Material Name
                </Label>
                <Input
                  id="material-name"
                  value={formData.materialName}
                  disabled
                  className="bg-gray-50 border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qty" className="text-sm font-medium text-gray-700">
                  Qty
                </Label>
                <Input id="qty" value={formData.qty} disabled className="bg-gray-50 border-gray-300" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.status} onValueChange={(value) => handleFormChange("status", value)}>
                  <SelectTrigger className="w-full border-gray-300">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Select" disabled>
                      Select
                    </SelectItem>
                    <SelectItem value="Okay">Okay</SelectItem>
                    <SelectItem value="Cancel">Cancel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approved-qty" className="text-sm font-medium text-gray-700">
                  Approved Qty {formData.status === "Okay" && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="approved-qty"
                  type="number"
                  value={formData.approvedQty}
                  onChange={(e) => handleFormChange("approvedQty", e.target.value)}
                  placeholder="Enter approved quantity"
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks" className="text-sm font-medium text-gray-700">
                  Remarks
                </Label>
                <Input
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => handleFormChange("remarks", e.target.value)}
                  placeholder="Enter remarks (optional)"
                  className="border-gray-300"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={handleDialogClose}
                disabled={isSubmitting}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}