import { useState, useRef, useEffect } from "react";

/**
 * Encapsulates all DentalToothGrid state and event handlers.
 * Returns everything the main component needs to render.
 */
export function useDentalToothGrid({
  value = {},
  onChange,
  toothComments = {},
  onCommentChange = () => {},
  treatmentSteps = {},
  onTreatmentStepsChange = () => {},
}) {
  const [selectedModule, setSelectedModule] = useState(null);
  const [dragOverTooth, setDragOverTooth] = useState(null);
  const [commentPopup, setCommentPopup] = useState(null);
  const [selectedStep, setSelectedStep] = useState(null);
  const [dragOverGap, setDragOverGap] = useState(null);
  const [stepEditPopup, setStepEditPopup] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [highlightedSummaryStep, setHighlightedSummaryStep] = useState(null);
  const [hoveredSummaryStep, setHoveredSummaryStep] = useState(null);

  const draggingModuleRef = useRef(null);
  const draggingStepRef = useRef(null);
  const treatmentStepsRef = useRef(treatmentSteps);
  treatmentStepsRef.current = treatmentSteps;

  const effectiveHighlight = hoveredSummaryStep ?? highlightedSummaryStep;

  useEffect(() => {
    if (showPreview) {
      document.body.classList.add("tp-preview-printing");
      return () => document.body.classList.remove("tp-preview-printing");
    }
  }, [showPreview]);

  const applyModule = (toothNum, moduleId) => {
    const current = value[toothNum] || [];
    const hasIt = current.includes(moduleId);
    if (moduleId === "comment") {
      setCommentPopup({ toothNum });
      return;
    }
    const next = {
      ...value,
      [toothNum]: hasIt
        ? current.filter((id) => id !== moduleId)
        : [...current, moduleId],
    };
    if (next[toothNum].length === 0) delete next[toothNum];
    onChange(next);
  };

  const removeModule = (toothNum, moduleId) => {
    const current = value[toothNum] || [];
    const next = {
      ...value,
      [toothNum]: current.filter((id) => id !== moduleId),
    };
    if (next[toothNum].length === 0) delete next[toothNum];
    onChange(next);
    if (moduleId === "comment") onCommentChange(toothNum, null);
  };

  const saveComment = (toothNum, text) => {
    if (text) {
      const current = value[toothNum] || [];
      if (!current.includes("comment"))
        onChange({ ...value, [toothNum]: [...current, "comment"] });
      onCommentChange(toothNum, text);
    }
    setCommentPopup(null);
  };

  const removeComment = (toothNum) => {
    const current = value[toothNum] || [];
    const next = {
      ...value,
      [toothNum]: current.filter((id) => id !== "comment"),
    };
    if (next[toothNum].length === 0) delete next[toothNum];
    onChange(next);
    onCommentChange(toothNum, null);
    setCommentPopup(null);
  };

  const addStepToGap = (gapKey, stepNum) => {
    const current = treatmentSteps[gapKey] || [];
    const existingIdx = current.findIndex((s) => s.stepNum === stepNum);
    if (existingIdx !== -1) {
      setStepEditPopup({ gapKey, stepIdx: existingIdx, isNew: false });
      return;
    }
    const newIdx = current.length;
    onTreatmentStepsChange({
      ...treatmentSteps,
      [gapKey]: [...current, { stepNum, stripings: [] }],
    });
    setStepEditPopup({ gapKey, stepIdx: newIdx, isNew: true });
  };

  const saveStepStripings = (gapKey, stepIdx, stripings, fallbackStep) => {
    const latest = treatmentStepsRef.current;
    const current = [...(latest[gapKey] || [])];
    const existingStep = current[stepIdx] ?? fallbackStep;
    current[stepIdx] = { ...existingStep, stripings };
    onTreatmentStepsChange({ ...latest, [gapKey]: current });
    setStepEditPopup(null);
  };

  const removeStep = (gapKey, stepIdx) => {
    const current = [...(treatmentSteps[gapKey] || [])];
    current.splice(stepIdx, 1);
    const next = { ...treatmentSteps };
    if (current.length === 0) delete next[gapKey];
    else next[gapKey] = current;
    onTreatmentStepsChange(next);
    setStepEditPopup(null);
  };

  const handleModuleDragStart = (id) => {
    draggingModuleRef.current = id;
  };
  const handleModuleDragEnd = () => {
    draggingModuleRef.current = null;
    setDragOverTooth(null);
  };
  const handleToothDragOver = (num) => (e) => {
    e.preventDefault();
    setDragOverTooth(num);
  };
  const handleToothDragLeave = () => setDragOverTooth(null);
  const handleToothDrop = (num) => (e) => {
    e.preventDefault();
    setDragOverTooth(null);
    if (draggingModuleRef.current) {
      applyModule(num, draggingModuleRef.current);
      draggingModuleRef.current = null;
    }
  };

  const handleStepDragStart = (num) => {
    draggingStepRef.current = num;
  };
  const handleStepDragEnd = () => {
    draggingStepRef.current = null;
    setDragOverGap(null);
  };
  const handleGapDragOver = (key) => (e) => {
    e.preventDefault();
    setDragOverGap(key);
  };
  const handleGapDragLeave = () => setDragOverGap(null);
  const handleGapDrop = (key) => (e) => {
    e.preventDefault();
    setDragOverGap(null);
    if (draggingStepRef.current != null) {
      addStepToGap(key, draggingStepRef.current);
      draggingStepRef.current = null;
    }
  };
  const handleGapClick = (key) => {
    if (selectedStep != null) addStepToGap(key, selectedStep);
  };

  const openStepEdit = (gapKey, stepIdx, isNew = false) =>
    setStepEditPopup({ gapKey, stepIdx, isNew });
  const closeStepEdit = () => setStepEditPopup(null);

  return {
    selectedModule,
    setSelectedModule,
    dragOverTooth,
    commentPopup,
    setCommentPopup,
    selectedStep,
    setSelectedStep,
    dragOverGap,
    stepEditPopup,
    showPreview,
    setShowPreview,
    highlightedSummaryStep,
    setHighlightedSummaryStep,
    hoveredSummaryStep,
    setHoveredSummaryStep,
    effectiveHighlight,
    applyModule,
    removeModule,
    saveComment,
    removeComment,
    addStepToGap,
    saveStepStripings,
    removeStep,
    openStepEdit,
    closeStepEdit,
    handleModuleDragStart,
    handleModuleDragEnd,
    handleToothDragOver,
    handleToothDragLeave,
    handleToothDrop,
    handleStepDragStart,
    handleStepDragEnd,
    handleGapDragOver,
    handleGapDragLeave,
    handleGapDrop,
    handleGapClick,
    value,
    treatmentSteps,
    toothComments,
  };
}
