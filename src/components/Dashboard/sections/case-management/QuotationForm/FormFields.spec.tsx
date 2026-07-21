import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FormFields from "./FormFields";

describe("FormFields", () => {
  it("renders treatment duration input when showTreatmentDuration is true", () => {
    render(
      <FormFields
        treatmentDuration="12"
        onDurationChange={vi.fn()}
        showTreatmentDuration={true}
      />
    );
    expect(screen.getByLabelText(/treatment duration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/treatment steps/i)).toBeInTheDocument();
  });

  it("does not render treatment duration when showTreatmentDuration is false", () => {
    render(
      <FormFields
        treatmentDuration="12"
        onDurationChange={vi.fn()}
        showTreatmentDuration={false}
      />
    );
    expect(
      screen.queryByLabelText(/treatment duration/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/treatment steps/i)).not.toBeInTheDocument();
  });

  it("calls onDurationChange when duration input changes", () => {
    const onDurationChange = vi.fn();
    render(
      <FormFields treatmentDuration="" onDurationChange={onDurationChange} />
    );
    const durationInput = screen.getByLabelText(
      /treatment duration in months/i
    );
    fireEvent.change(durationInput, { target: { value: "9" } });
    expect(onDurationChange).toHaveBeenCalled();
  });
});
