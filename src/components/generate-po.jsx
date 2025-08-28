"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { FileCheck, FileText, Loader2, Upload, Search, Filter } from "lucide-react"

// Shadcn UI components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const GeneratePO = () => {
  // States
  const [pendingIndents, setPendingIndents] = useState([])
  const [poHistory, setPoHistory] = useState([])
  const [partyNames, setPartyNames] = useState([]) // New state for party names
  const [selectedIndent, setSelectedIndent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("pending")
  const [searchTerm, setSearchTerm] = useState("")
  const [haveToPO, setHaveToPO] = useState("") // New state for yes/no selection

  // Cancel Order States
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [selectedCancelPO, setSelectedCancelPO] = useState(null)
  const [cancelFormData, setCancelFormData] = useState({
    orderNumber: "",
    fmsName: "",
    qtyCancelled: "",
    remarks: ""
  })
  const [cancelErrors, setCancelErrors] = useState({})
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false)
  const [cancelledOrders, setCancelledOrders] = useState(new Set())

  // Form state
  const [formData, setFormData] = useState({
    indentNumber: "",
    materialName: "",
    brokerName: "",
    partyName: "",
    qty: "",
    rate: "",
    leadTimeToLift: "",
    poFile: null,
    transportingType: "Select",
    femPercent: "",
    yieldPercent: "",
    poNumber: "", // Changed from erpNumber to poNumber
    paymentTerm: "", // New field for Payment Term
  })

  // Form errors
  const [errors, setErrors] = useState({})

  const [visibleColumns, setVisibleColumns] = useState([
    'action', 'indentNumber', 'indenterName', 'materialName',
    'brokerName', 'location', 'division', 'approvedQty'
  ]);

  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState([
    'action', 'poNumber', 'indentNumber', 'materialName',
    'brokerName', 'partyName', 'qty', 'rate', 'leadTimeToLift',
    'poCopy', 'transportingType', 'generatePoStatus', 'erpNumber', 'paymentTerm'
  ]);

  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const [isHistoryColumnDropdownOpen, setIsHistoryColumnDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Column options
  const columnOptions = [
    { value: 'indentNumber', label: 'Indent Number' },
    { value: 'indenterName', label: 'Indenter Name' },
    { value: 'materialName', label: 'Material Name' },
    { value: 'brokerName', label: 'Broker Name' },
    { value: 'location', label: 'Location' },
    { value: 'division', label: 'Division' },
    { value: 'approvedQty', label: 'Approved Qty' }
  ];

  const historyColumnOptions = [
    { value: 'poNumber', label: 'PO Number' },
    { value: 'indentNumber', label: 'Indent Number' },
    { value: 'materialName', label: 'Material Name' },
    { value: 'brokerName', label: 'Broker Name' },
    { value: 'partyName', label: 'Party Name' },
    { value: 'qty', label: 'Qty' },
    { value: 'rate', label: 'Rate' },
    { value: 'leadTimeToLift', label: 'Lead Time' },
    { value: 'poCopy', label: 'PO Copy' },
    { value: 'transportingType', label: 'Transporting Type' },
    { value: 'generatePoStatus', label: 'Generate PO Status' },
    { value: 'erpNumber', label: 'ERP PO NO.' },
    { value: 'paymentTerm', label: 'Payment Term' }
  ];

  // Toggle functions
  const toggleColumnVisibility = (column) => {
    setVisibleColumns(prev =>
      prev.includes(column)
        ? prev.filter(col => col !== column)
        : [...prev, column]
    );
  };

  const toggleHistoryColumnVisibility = (column) => {
    setVisibleHistoryColumns(prev =>
      prev.includes(column)
        ? prev.filter(col => col !== column)
        : [...prev, column]
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsColumnDropdownOpen(false);
        setIsHistoryColumnDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Google Sheet Details
  const scriptUrl =
    "https://script.google.com/macros/s/AKfycbx3_COAFa1T6tCTjJT8Ip0ep7Qy83wA7ZpJteErgfzZ-gQG0Zf8Yxw6iTspQ5oGy6Q/exec"
  const sheetId = "19Za1BvjKvHT01rzDOPLS_MErnuEJd6__l7C_4lUgLlg"
  const indentSheetName = "INDENT"
  const poSheetName = "PO"
  const masterSheetName = "MASTER" // Added MASTER sheet name
  const driveFolder = "1lSFs1I2gE3fnvZYpYcTHR6rSApUbfXxt"

  // Cancel Form Constants
  const CANCEL_FORM_SHEET_ID = "1iJlsCMq4pCTTpi6YECAT3TyLs3D1jgCuv_C_smwXw2o"
  const CANCEL_FORM_SHEET_NAME = "Form responses 1"
  const CANCEL_FORM_API_URL = "https://script.google.com/macros/s/AKfycbzhavABJ40PlN7P0AGJ1PWrjnpj7TilmFI3OTTvfF6qxchSLzmm33-B9at8yCuH6gQGDA/exec"
  const FMS_OPTIONS = [
    "Purchase FMS",
    "Order to Dispatch",
    "Production Planning FMS",
    "Semi Finished FMS Billet"
  ]

  useEffect(() => {
    const storedCancelledOrders = localStorage.getItem('cancelledOrders');
    if (storedCancelledOrders) {
      setCancelledOrders(new Set(JSON.parse(storedCancelledOrders)));
    }
  }, []);
  // Fetch data from Google Sheets
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch INDENT data
        const indentUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(indentSheetName)}&range=A7:Q1000`
        const indentResponse = await fetch(indentUrl)
        if (!indentResponse.ok) {
          throw new Error(`Failed to fetch indent data: ${indentResponse.status}`)
        }
        const indentText = await indentResponse.text()
        const indentJsonStart = indentText.indexOf("{")
        const indentJsonEnd = indentText.lastIndexOf("}")
        const indentJsonString = indentText.substring(indentJsonStart, indentJsonEnd + 1)
        const indentData = JSON.parse(indentJsonString)

        // Process INDENT data for pending (P not null, Q null)
        const processedIndents = indentData.table.rows
          .map((row, index) => {
            const getCellValue = (cellIndex) => {
              const cell = row.c && row.c[cellIndex]
              return cell && cell.v !== null && cell.v !== undefined ? String(cell.v) : ""
            }

            const columnP = getCellValue(15) // Column P (index 15)
            const columnQ = getCellValue(16) // Column Q (index 16)

            return {
              id: `indent-${index + 7}`,
              rowIndex: index + 7,
              indentNumber: getCellValue(1), // Column B
              indenterName: getCellValue(2), // Column C
              materialName: getCellValue(3), // Column D
              brokerName: getCellValue(4), // Column E
              location: getCellValue(7), // Column H
              division: getCellValue(8), // Column I
              approvedQty: getCellValue(14), // Column O
              columnP: columnP,
              columnQ: columnQ,
            }
          })
          .filter(
            (indent) =>
              indent.columnP && indent.columnP.trim() !== "" && (!indent.columnQ || indent.columnQ.trim() === ""),
          )

        setPendingIndents(processedIndents)

        // Fetch PO data
        const poUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(poSheetName)}&range=A7:Z1000`
        const poResponse = await fetch(poUrl)
        if (!poResponse.ok) {
          throw new Error(`Failed to fetch PO data: ${poResponse.status}`)
        }
        const poText = await poResponse.text()
        const poJsonStart = poText.indexOf("{")
        const poJsonEnd = poText.lastIndexOf("}")
        const poJsonString = poText.substring(poJsonStart, poJsonEnd + 1)
        const poData = JSON.parse(poJsonString)

        // Process PO data for history
        const processedPOs = poData.table.rows
          .map((row, index) => {
            const getCellValue = (cellIndex) => {
              const cell = row.c && row.c[cellIndex]
              return cell && cell.v !== null && cell.v !== undefined ? String(cell.v) : ""
            }

            return {
              id: `po-${index + 7}`,
              timestamp: getCellValue(0), // Column A
              poNumber: getCellValue(1), // Column B - Changed from erpPoNumber to poNumber
              indentNumber: getCellValue(2), // Column C
              materialName: getCellValue(3), // Column D
              brokerName: getCellValue(4), // Column E
              partyName: getCellValue(5), // Column F
              qty: getCellValue(6), // Column G
              rate: getCellValue(7), // Column H
              leadTimeToLift: getCellValue(8), // Column I
              poCopy: getCellValue(9), // Column J
              transportingType: getCellValue(10), // Column K
              femPercent: getCellValue(11), // Column L
              yieldPercent: getCellValue(12), // Column M
              generatePoStatus: getCellValue(23), // Column X - Generate PO Status
              erpNumber: getCellValue(24), // Column Y - ERP PO NO.
              paymentTerm: getCellValue(25), // Column Z - Payment Term
            }
          })
          .filter((po) => po.poNumber && po.poNumber.trim() !== "") // Changed from erpPoNumber to poNumber

        setPoHistory(processedPOs.reverse()) // Show latest first

        // Fetch MASTER sheet data for Party Names
        const masterUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(masterSheetName)}&range=D:D`
        const masterResponse = await fetch(masterUrl)
        if (!masterResponse.ok) {
          throw new Error(`Failed to fetch master data: ${masterResponse.status}`)
        }
        const masterText = await masterResponse.text()
        const masterJsonStart = masterText.indexOf("{")
        const masterJsonEnd = masterText.lastIndexOf("}")
        const masterJsonString = masterText.substring(masterJsonStart, masterJsonEnd + 1)
        const masterData = JSON.parse(masterJsonString)

        // Process MASTER data for Party Names (Column D)
        const partyNamesList = masterData.table.rows
          .map((row) => {
            const cell = row.c && row.c[0] // Column D is index 0 in D:D range
            return cell && cell.v !== null && cell.v !== undefined ? String(cell.v).trim() : ""
          })
          .filter((name) => name !== "" && name.toLowerCase() !== "party name") // Remove empty values and header
          .filter((name, index, array) => array.indexOf(name) === index) // Remove duplicates
          .sort() // Sort alphabetically

        setPartyNames(partyNamesList)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching data:", error)
        setError("Failed to load data: " + error.message)
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter pending indents based on search term
  const filteredPendingIndents = useMemo(() => {
    if (!searchTerm.trim()) return pendingIndents

    return pendingIndents.filter(
      (indent) =>
        indent.indentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.indenterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.brokerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.division.toLowerCase().includes(searchTerm.toLowerCase()) ||
        indent.approvedQty.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [pendingIndents, searchTerm])

  // Filter PO history based on search term
  const filteredPoHistory = useMemo(() => {
    if (!searchTerm.trim()) return poHistory

    return poHistory.filter(
      (po) =>
        po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) || // Changed from erpPoNumber to poNumber
        po.indentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.brokerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.qty.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.rate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.transportingType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (po.erpNumber && po.erpNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (po.paymentTerm && po.paymentTerm.toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }, [poHistory, searchTerm])

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData({
        ...formData,
        poFile: file,
      })
    }
  }

  // Handle Have To Make PO dropdown change
  const handleHaveToPOChange = (value) => {
    setHaveToPO(value)
  }

  // Handle Party Name dropdown change
  const handlePartyNameChange = (value) => {
    setFormData({
      ...formData,
      partyName: value,
    })
  }

  // Cancel Order Handlers
  const handleCancelClick = (po) => {
    setSelectedCancelPO(po)
    setCancelFormData({
      orderNumber: po.indentNumber,
      fmsName: "",
      qtyCancelled: "",
      remarks: ""
    })
    setCancelErrors({})
    setIsCancelModalOpen(true)
  }

  const handleCancelFormInputChange = (e) => {
    const { name, value } = e.target
    setCancelFormData({
      ...cancelFormData,
      [name]: value
    })
    // Clear error when user starts typing
    if (cancelErrors[name]) {
      setCancelErrors({
        ...cancelErrors,
        [name]: ""
      })
    }
  }

  const handleCancelFormSelectChange = (name, value) => {
    setCancelFormData({
      ...cancelFormData,
      [name]: value
    })
    // Clear error when user selects
    if (cancelErrors[name]) {
      setCancelErrors({
        ...cancelErrors,
        [name]: ""
      })
    }
  }

  const closeCancelModal = () => {
    setIsCancelModalOpen(false)
    setSelectedCancelPO(null)
    setCancelFormData({
      orderNumber: "",
      fmsName: "",
      qtyCancelled: "",
      remarks: ""
    })
    setCancelErrors({})
  }

  const validateCancelForm = () => {
    const newErrors = {}

    if (!cancelFormData.orderNumber.trim()) {
      newErrors.orderNumber = "Order Number is required"
    }
    if (!cancelFormData.fmsName.trim()) {
      newErrors.fmsName = "FMS Name is required"
    }
    if (!cancelFormData.qtyCancelled.trim()) {
      newErrors.qtyCancelled = "Qty Cancelled is required"
    }

    setCancelErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const submitCancelForm = async () => {
    if (!validateCancelForm()) {
      return
    }

    setIsCancelSubmitting(true)

    try {
      // Generate timestamp
      const now = new Date()
      const timestamp = now
        .toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        .replace(",", "")

      // Prepare data for Form responses 1 sheet
      const cancelRowData = [
        timestamp, // Timestamp
        cancelFormData.orderNumber, // Order Number
        cancelFormData.fmsName, // FMS Name
        cancelFormData.qtyCancelled, // Qty Cancelled
        cancelFormData.remarks || "" // Remarks
      ]

      // Use URLSearchParams for proper form encoding
      const params = new URLSearchParams()
      params.append("action", "insert")
      params.append("sheetName", CANCEL_FORM_SHEET_NAME)
      params.append("rowData", JSON.stringify(cancelRowData))

      console.log("Submitting cancel form data:", {
        action: "insert",
        sheetName: CANCEL_FORM_SHEET_NAME,
        rowData: cancelRowData
      })

      const response = await fetch(CANCEL_FORM_API_URL, {
        method: "POST",
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })

      console.log("Cancel form response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Cancel form submission failed:", errorText)
        throw new Error(`Failed to submit cancel form: ${response.status} - ${errorText}`)
      }

      const result = await response.text()
      console.log("Cancel form submission result:", result)

      // Add the order to cancelled orders set
      const newCancelledOrders = new Set([...cancelledOrders, selectedCancelPO.indentNumber]);
      setCancelledOrders(newCancelledOrders);
      localStorage.setItem('cancelledOrders', JSON.stringify([...newCancelledOrders]));
      closeCancelModal()
      alert("Cancel order request submitted successfully!")

    } catch (error) {
      console.error("Error submitting cancel form:", error)
      alert(`Error: ${error.message || "An unexpected error occurred while submitting cancel request."}`)
    } finally {
      setIsCancelSubmitting(false)
    }
  }

  // Upload file to Google Drive
  const uploadFileToDrive = async (file) => {
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result)
        reader.onerror = (error) => reject(error)
      })

      const driveFormData = new FormData()
      driveFormData.append("action", "uploadFile")
      driveFormData.append("fileName", file.name)
      driveFormData.append("mimeType", file.type)
      driveFormData.append("base64Data", base64Data)
      driveFormData.append("folderId", driveFolder)

      const response = await fetch(scriptUrl, {
        method: "POST",
        body: driveFormData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to upload file: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || "Failed to upload file via Apps Script")
      }
      return result.fileUrl
    } catch (error) {
      console.error("Error uploading file to Google Drive:", error)
      throw error
    }
  }

  // Update Google Sheets
  const updateSheets = async (dataToSubmit, fileUrl, haveToPOValue) => {
    try {
      // Generate timestamp
      const now = new Date()
      const timestamp = now
        .toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        .replace(",", "")

      // Prepare PO sheet data
      const poRowData = [
        timestamp, // Column A
        dataToSubmit.poNumber || "", // Column B - Changed from erpPoNumber to poNumber (user input)
        dataToSubmit.indentNumber, // Column C
        dataToSubmit.materialName, // Column D
        dataToSubmit.brokerName, // Column E
        dataToSubmit.partyName || "", // Column F
        dataToSubmit.qty, // Column G
        dataToSubmit.rate || "", // Column H
        dataToSubmit.leadTimeToLift || "", // Column I
        fileUrl || "", // Column J
        dataToSubmit.transportingType === "Select" ? "" : dataToSubmit.transportingType, // Column K
        dataToSubmit.femPercent || "", // Column L
        dataToSubmit.yieldPercent || "", // Column M
        "", // Column N
        "", // Column O
        "", // Column P
        "", // Column Q
        "", // Column R
        "", // Column S
        "", // Column T
        "", // Column U
        "", // Column V
        "", // Column W
        haveToPOValue, // Column X - Generate PO Status
        "", // Column Y - Empty now (was ERP PO NO.)
        dataToSubmit.paymentTerm || "", // Column Z - Payment Term
      ]

      // Add to PO sheet
      const poPayload = new FormData()
      poPayload.append("action", "insert")
      poPayload.append("sheetName", poSheetName)
      poPayload.append("rowData", JSON.stringify(poRowData))

      const poResponse = await fetch(scriptUrl, {
        method: "POST",
        body: poPayload,
      })

      if (!poResponse.ok) {
        throw new Error(`Failed to update PO sheet: ${poResponse.status}`)
      }

      return { success: true }
    } catch (error) {
      console.error("Error updating sheets:", error)
      throw error
    }
  }

  // Handle indent selection
  const handleIndentSelect = (indent) => {
    setSelectedIndent(indent)
    setFormData({
      indentNumber: indent.indentNumber,
      materialName: indent.materialName,
      brokerName: indent.brokerName, // Changed from indent.brokerName to indent.indenterName
      partyName: "",
      qty: indent.approvedQty,
      rate: "",
      leadTimeToLift: "",
      poFile: null,
      transportingType: "Select",
      femPercent: "",
      yieldPercent: "",
      poNumber: "", // Changed from erpNumber to poNumber
      paymentTerm: "", // Reset Payment Term field
    })
    setErrors({})
    setHaveToPO("") // Reset the dropdown selection
    setIsModalOpen(true)
  }

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedIndent(null)
    setFormData({
      indentNumber: "",
      materialName: "",
      brokerName: "", // This will now contain indenterName
      partyName: "",
      qty: "",
      rate: "",
      leadTimeToLift: "",
      poFile: null,
      transportingType: "Select",
      femPercent: "",
      yieldPercent: "",
      poNumber: "", // Changed from erpNumber to poNumber
      paymentTerm: "", // Reset Payment Term field
    })
    setErrors({})
    setHaveToPO("") // Reset the dropdown selection
  }

  // Form validation
  const validateForm = () => {
    const newErrors = {}

    if (haveToPO === "yes") {
      if (!formData.partyName.trim()) newErrors.partyName = "Party Name is required"
      if (!formData.qty.trim()) newErrors.qty = "Qty is required"
      if (!formData.rate.trim()) newErrors.rate = "Rate is required"
      if (!formData.leadTimeToLift.trim()) newErrors.leadTimeToLift = "Lead Time is required"
      if (formData.transportingType === "Select") newErrors.transportingType = "Please select transporting type"
      if (!formData.poNumber.trim()) newErrors.poNumber = "Po Number is required" // Added validation for Po Number
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate form if haveToPO is "yes"
    if (haveToPO === "yes" && !validateForm()) {
      return
    }

    if (!selectedIndent) {
      alert("No indent selected.")
      return
    }

    setIsSubmitting(true)

    try {
      // Upload file if provided and haveToPO is "yes"
      let fileUrl = ""
      if (haveToPO === "yes" && formData.poFile) {
        fileUrl = await uploadFileToDrive(formData.poFile)
      }

      // Update sheets with haveToPO value
      await updateSheets(formData, fileUrl, haveToPO)

      // Update local state
      const newPO = {
        id: `po-new-${Date.now()}`,
        timestamp: new Date()
          .toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
          .replace(",", ""),
        poNumber: haveToPO === "yes" ? formData.poNumber : "", // Changed from erpPoNumber to poNumber
        indentNumber: formData.indentNumber,
        materialName: formData.materialName,
        brokerName: formData.brokerName,
        partyName: haveToPO === "yes" ? formData.partyName : "",
        qty: formData.qty,
        rate: haveToPO === "yes" ? formData.rate : "",
        leadTimeToLift: haveToPO === "yes" ? formData.leadTimeToLift : "",
        poCopy: fileUrl,
        transportingType: haveToPO === "yes" ? formData.transportingType : "",
        femPercent: haveToPO === "yes" ? formData.femPercent : "",
        yieldPercent: haveToPO === "yes" ? formData.yieldPercent : "",
        generatePoStatus: haveToPO, // Store the yes/no value
        erpNumber: "", // Keep empty for column Y
        paymentTerm: haveToPO === "yes" ? formData.paymentTerm : "", // Store Payment Term
      }

      setPoHistory((prev) => [newPO, ...prev])
      setPendingIndents((prev) => prev.filter((indent) => indent.id !== selectedIndent.id))

      closeModal()
      setIsSubmitting(false)
      alert(`Purchase Order ${haveToPO === "yes" ? formData.poNumber : "entry"} has been saved successfully.`) // Updated success message
    } catch (error) {
      console.error("Error submitting form:", error)
      setIsSubmitting(false)
      alert(`Error: ${error.message || "An unexpected error occurred during submission."}`)
    }
  }

  return (
    <div className="pt-0 px-4 pb-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <TabsList className="grid grid-cols-2 w-full sm:w-auto">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeTab === "pending" && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
                  className="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
                >
                  <span>Columns</span>
                  <svg
                    className={`ml-2 h-4 w-4 transition-transform ${isColumnDropdownOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {isColumnDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                    <div className="p-2">
                      {columnOptions.map((column) => (
                        <div
                          key={column.value}
                          className="flex items-center px-3 py-2 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => toggleColumnVisibility(column.value)}
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns.includes(column.value)}
                            readOnly
                            className="mr-2 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">{column.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsHistoryColumnDropdownOpen(!isHistoryColumnDropdownOpen)}
                  className="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
                >
                  <span>Columns</span>
                  <svg
                    className={`ml-2 h-4 w-4 transition-transform ${isHistoryColumnDropdownOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {isHistoryColumnDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                    <div className="p-2">
                      {historyColumnOptions.map((column) => (
                        <div
                          key={column.value}
                          className="flex items-center px-3 py-2 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => toggleHistoryColumnVisibility(column.value)}
                        >
                          <input
                            type="checkbox"
                            checked={visibleHistoryColumns.includes(column.value)}
                            readOnly
                            className="mr-2 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">{column.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}</div>
            )}
          </div>
          <div className="relative w-full sm:w-96">
            <Input
              placeholder={
                activeTab === "pending"
                  ? "Search by indent number, material, broker..."
                  : "Search by PO number, indent, material..."
              }
              className="border-gray-300 rounded-md bg-white w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="pending" className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-full">
                  <FileCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">PO Pending</h2>
                  <p className="text-sm text-gray-500">Select an indent to generate its purchase order</p>
                </div>
              </div>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-red-200 rounded-lg">
                  <FileText className="h-10 w-10 text-red-300 mb-2" />
                  <p className="text-gray-500 text-center">{error}</p>
                </div>
              ) : filteredPendingIndents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-blue-200 rounded-lg">
                  <FileText className="h-10 w-10 text-blue-300 mb-2" />
                  <p className="text-gray-500 text-center">
                    {searchTerm ? "No matching pending indents found." : "No pending indents found for PO generation."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {visibleColumns.includes('action') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                        )}
                        {visibleColumns.includes('indentNumber') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Indent Number
                          </th>
                        )}
                        {visibleColumns.includes('indenterName') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Indenter Name
                          </th>
                        )}
                        {visibleColumns.includes('materialName') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Material Name
                          </th>
                        )}
                        {visibleColumns.includes('brokerName') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Broker Name
                          </th>
                        )}
                        {visibleColumns.includes('location') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                        )}
                        {visibleColumns.includes('division') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Division
                          </th>
                        )}
                        {visibleColumns.includes('approvedQty') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Approved Qty
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPendingIndents.map((indent) => (
                        <tr key={indent.id} className="hover:bg-blue-50">
                          {visibleColumns.includes('action') && (
                            <td className="px-4 py-2 whitespace-nowrap">
                              <Button onClick={() => handleIndentSelect(indent)} size="sm">
                                Generate PO
                              </Button>
                            </td>
                          )}
                          {visibleColumns.includes('indentNumber') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-blue-600">
                              {indent.indentNumber}
                            </td>
                          )}
                          {visibleColumns.includes('indenterName') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{indent.indenterName}</td>
                          )}
                          {visibleColumns.includes('materialName') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{indent.materialName}</td>
                          )}
                          {visibleColumns.includes('brokerName') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{indent.brokerName}</td>
                          )}
                          {visibleColumns.includes('location') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{indent.location}</td>
                          )}
                          {visibleColumns.includes('division') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{indent.division}</td>
                          )}
                          {visibleColumns.includes('approvedQty') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{indent.approvedQty}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-full">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Purchase Order History</h2>
                  <p className="text-sm text-gray-500">View all generated purchase orders</p>
                </div>
              </div>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                </div>
              ) : filteredPoHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-blue-200 rounded-lg">
                  <FileText className="h-10 w-10 text-blue-300 mb-2" />
                  <p className="text-gray-500 text-center">
                    {searchTerm ? "No matching purchase orders found." : "No purchase orders found."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {visibleHistoryColumns.includes('action') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                        )}
                        {visibleHistoryColumns.includes('poNumber') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            PO Number
                          </th>
                        )}
                        {visibleHistoryColumns.includes('indentNumber') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Indent Number
                          </th>
                        )}
                        {visibleHistoryColumns.includes('materialName') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Material Name
                          </th>
                        )}
                        {visibleHistoryColumns.includes('brokerName') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Broker Name
                          </th>
                        )}
                        {visibleHistoryColumns.includes('partyName') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Party Name
                          </th>
                        )}
                        {visibleHistoryColumns.includes('qty') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Qty
                          </th>
                        )}
                        {visibleHistoryColumns.includes('rate') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rate
                          </th>
                        )}
                        {visibleHistoryColumns.includes('leadTimeToLift') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lead Time
                          </th>
                        )}
                        {visibleHistoryColumns.includes('poCopy') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            PO Copy
                          </th>
                        )}
                        {visibleHistoryColumns.includes('transportingType') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Transporting Type
                          </th>
                        )}
                        {visibleHistoryColumns.includes('generatePoStatus') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Generate PO Status
                          </th>
                        )}
                        {visibleHistoryColumns.includes('erpNumber') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ERP PO NO.
                          </th>
                        )}
                        {visibleHistoryColumns.includes('paymentTerm') && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payment Term
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPoHistory.map((po) => (
                        <tr key={po.id} className="hover:bg-blue-50">
                          {visibleHistoryColumns.includes('action') && (
                            <td className="px-4 py-2 whitespace-nowrap">
                              <Button
                                onClick={() => handleCancelClick(po)}
                                size="sm"
                                variant="destructive"
                                disabled={cancelledOrders.has(po.indentNumber)}
                              >
                                {cancelledOrders.has(po.indentNumber) ? "Cancelled" : "Cancel Order"}
                              </Button>
                            </td>
                          )}
                          {visibleHistoryColumns.includes('poNumber') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-blue-600">
                              {po.poNumber}
                            </td>
                          )}
                          {visibleHistoryColumns.includes('indentNumber') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{po.indentNumber}</td>
                          )}
                          {visibleHistoryColumns.includes('materialName') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{po.materialName}</td>
                          )}
                          {visibleHistoryColumns.includes('brokerName') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{po.brokerName}</td>
                          )}
                          {visibleHistoryColumns.includes('partyName') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{po.partyName}</td>
                          )}
                          {visibleHistoryColumns.includes('qty') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{po.qty}</td>
                          )}
                          {visibleHistoryColumns.includes('rate') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{po.rate}</td>
                          )}
                          {visibleHistoryColumns.includes('leadTimeToLift') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{po.leadTimeToLift}</td>
                          )}
                          {visibleHistoryColumns.includes('poCopy') && (
                            <td className="px-4 py-2 whitespace-nowrap">
                              {po.poCopy ? (
                                <a
                                  href={po.poCopy}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-blue-600 hover:underline text-sm"
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  View File
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                          )}
                          {visibleHistoryColumns.includes('transportingType') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{po.transportingType}</td>
                          )}
                          {visibleHistoryColumns.includes('generatePoStatus') && (
                            <td className="px-4 py-2 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${po.generatePoStatus === "yes"
                                ? "bg-green-100 text-green-800"
                                : po.generatePoStatus === "no"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                                }`}>
                                {po.generatePoStatus || "-"}
                              </span>
                            </td>
                          )}
                          {visibleHistoryColumns.includes('erpNumber') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{po.erpNumber || "-"}</td>
                          )}
                          {visibleHistoryColumns.includes('paymentTerm') && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{po.paymentTerm || "-"}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Generate PO Modal with Yes/No Selection */}
      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedIndent
                  ? `Creating PO for ${selectedIndent.indentNumber} (${selectedIndent.indenterName}) - ${selectedIndent.materialName}`
                  : "Purchase Order Details"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {/* Have To Make PO Dropdown */}
              <div className="mb-6">
                <Label htmlFor="haveToPO" className="text-base font-medium">
                  Do you want to generate Purchase Order?
                </Label>
                <Select onValueChange={handleHaveToPOChange} value={haveToPO}>
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Show form based on haveToPO selection */}
              {haveToPO === "yes" && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="indentNumber">Indent Number</Label>
                      <Input
                        id="indentNumber"
                        name="indentNumber"
                        value={formData.indentNumber}
                        readOnly
                        className="bg-gray-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="materialName">Material Name</Label>
                      <Input
                        id="materialName"
                        name="materialName"
                        value={formData.materialName}
                        readOnly
                        className="bg-gray-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="brokerName">Indenter Name</Label>
                      <Input
                        id="brokerName"
                        name="brokerName"
                        value={formData.brokerName}
                        readOnly
                        className="bg-gray-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="partyName">Party Name *</Label>
                      <div className="relative">
                        <Input
                          list="partyNamesList"
                          id="partyName"
                          name="partyName"
                          value={formData.partyName}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              partyName: e.target.value,
                            });
                            setErrors({
                              ...errors,
                              partyName: "",
                            });
                          }}
                          placeholder="Type to search party names"
                          className={errors.partyName ? "border-red-500" : ""}
                        />
                        <datalist id="partyNamesList">
                          {partyNames.map((party, index) => (
                            <option key={index} value={party} />
                          ))}
                        </datalist>
                      </div>
                      {errors.partyName && <p className="text-xs text-red-600">{errors.partyName}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="qty">Qty *</Label>
                      <Input
                        type="number"
                        step="any"
                        id="qty"
                        name="qty"
                        value={formData.qty}
                        onChange={handleInputChange}
                        placeholder="Enter quantity"
                        className={errors.qty ? "border-red-500" : ""}
                      />
                      {errors.qty && <p className="text-xs text-red-600">{errors.qty}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="rate">Rate *</Label>
                      <Input
                        type="number"
                        step="any"
                        id="rate"
                        name="rate"
                        value={formData.rate}
                        onChange={handleInputChange}
                        placeholder="Enter rate"
                        className={errors.rate ? "border-red-500" : ""}
                      />
                      {errors.rate && <p className="text-xs text-red-600">{errors.rate}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="leadTimeToLift">Lead Time To Lift Total Qty *</Label>
                      <Input
                        type="number"
                        id="leadTimeToLift"
                        name="leadTimeToLift"
                        value={formData.leadTimeToLift}
                        onChange={handleInputChange}
                        placeholder="Enter lead time"
                        className={errors.leadTimeToLift ? "border-red-500" : ""}
                      />
                      {errors.leadTimeToLift && <p className="text-xs text-red-600">{errors.leadTimeToLift}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="poNumber">ERP Number *</Label>
                      <Input
                        id="poNumber"
                        name="poNumber"
                        value={formData.poNumber}
                        onChange={handleInputChange}
                        placeholder="Enter ERP Number"
                        className={errors.poNumber ? "border-red-500" : ""}
                      />
                      {errors.poNumber && <p className="text-xs text-red-600">{errors.poNumber}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="paymentTerm">Payment Term</Label>
                      <Input
                        id="paymentTerm"
                        name="paymentTerm"
                        value={formData.paymentTerm}
                        onChange={handleInputChange}
                        placeholder="Enter Payment Term"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="poFile">PO Copy</Label>
                      <div className="relative flex items-center justify-center h-10 border border-dashed border-blue-200 rounded-md bg-blue-50 cursor-pointer hover:bg-blue-100">
                        <Input
                          type="file"
                          id="poFile"
                          name="poFile"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                        <Upload className="h-4 w-4 text-blue-500 mr-2" />
                        <span className="text-xs text-blue-600 truncate max-w-[calc(100%-30px)]">
                          {formData.poFile ? formData.poFile.name : "Upload PO Copy"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="transportingType">Transporting Type *</Label>
                      <Select
                        onValueChange={(value) =>
                          handleInputChange({
                            target: { name: "transportingType", value },
                          })
                        }
                        value={formData.transportingType}
                      >
                        <SelectTrigger className={errors.transportingType ? "border-red-500" : ""}>
                          <SelectValue placeholder="-- Select --" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Select" disabled>
                            Select
                          </SelectItem>
                          <SelectItem value="For">For</SelectItem>
                          <SelectItem value="Ex-Factory">Ex-Factory</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.transportingType && <p className="text-xs text-red-600">{errors.transportingType}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="femPercent">FEM %</Label>
                      <Input
                        type="number"
                        step="any"
                        id="femPercent"
                        name="femPercent"
                        value={formData.femPercent}
                        onChange={handleInputChange}
                        placeholder="Enter FEM %"
                        className={errors.femPercent ? "border-red-500" : ""}
                      />
                      {errors.femPercent && <p className="text-xs text-red-600">{errors.femPercent}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="yieldPercent">Yield %</Label>
                      <Input
                        type="number"
                        step="any"
                        id="yieldPercent"
                        name="yieldPercent"
                        value={formData.yieldPercent}
                        onChange={handleInputChange}
                        placeholder="Enter Yield %"
                        className={errors.yieldPercent ? "border-red-500" : ""}
                      />
                      {errors.yieldPercent && <p className="text-xs text-red-600">{errors.yieldPercent}</p>}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={closeModal}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Submitting...
                        </>
                      ) : (
                        "Submit"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              )}

              {/* Show only submit button when "No" is selected */}
              {haveToPO === "no" && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="text-center py-4">
                    <p className="text-gray-600">You have selected "No" for generating Purchase Order.</p>
                    <p className="text-sm text-gray-500 mt-2">Click Submit to save this decision.</p>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={closeModal}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Submitting...
                        </>
                      ) : (
                        "Submit"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel Order Modal */}
      {isCancelModalOpen && (
        <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Cancel Order</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-1">
                <Label htmlFor="orderNumber">Order Number *</Label>
                <Input
                  id="orderNumber"
                  name="orderNumber"
                  value={cancelFormData.orderNumber}
                  onChange={handleCancelFormInputChange}
                  className={`bg-gray-100 ${cancelErrors.orderNumber ? "border-red-500" : ""}`}
                  readOnly
                />
                {cancelErrors.orderNumber && (
                  <p className="text-xs text-red-600">{cancelErrors.orderNumber}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="fmsName">FMS Name *</Label>
                <Select
                  onValueChange={(value) => handleCancelFormSelectChange("fmsName", value)}
                  value={cancelFormData.fmsName}
                >
                  <SelectTrigger className={cancelErrors.fmsName ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select FMS Name" />
                  </SelectTrigger>
                  <SelectContent>
                    {FMS_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {cancelErrors.fmsName && (
                  <p className="text-xs text-red-600">{cancelErrors.fmsName}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="qtyCancelled">Qty Cancelled *</Label>
                <Input
                  type="number"
                  id="qtyCancelled"
                  name="qtyCancelled"
                  value={cancelFormData.qtyCancelled}
                  onChange={handleCancelFormInputChange}
                  placeholder="Enter quantity to cancel"
                  className={cancelErrors.qtyCancelled ? "border-red-500" : ""}
                />
                {cancelErrors.qtyCancelled && (
                  <p className="text-xs text-red-600">{cancelErrors.qtyCancelled}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="remarks">Remarks</Label>
                <Input
                  id="remarks"
                  name="remarks"
                  value={cancelFormData.remarks}
                  onChange={handleCancelFormInputChange}
                  placeholder="Enter remarks (optional)"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCancelModal}>
                Cancel
              </Button>
              <Button
                onClick={submitCancelForm}
                disabled={isCancelSubmitting}
                variant="destructive"
              >
                {isCancelSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  "Submit Cancel Request"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default GeneratePO