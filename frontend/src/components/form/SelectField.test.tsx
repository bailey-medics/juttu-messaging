import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine, remToPx, cssClass } from "@/test/test-utils";
import SelectField from "./SelectField";
import dropdownClasses from "./dropdownGroupLabel.module.css";

const options = [
  { value: "1", label: "James Green" },
  { value: "2", label: "Sarah Mitchell" },
];

describe("SelectField", () => {
  it("renders with a label", () => {
    renderWithMantine(<SelectField label="Space" data={options} />);
    expect(screen.getByText("Space")).toBeInTheDocument();
  });

  it("renders with placeholder text", () => {
    renderWithMantine(
      <SelectField label="Space" placeholder="Select a space" data={options} />,
    );
    expect(screen.getByPlaceholderText("Select a space")).toBeInTheDocument();
  });

  it("opens dropdown on click", async () => {
    const user = userEvent.setup();
    renderWithMantine(<SelectField label="Space" data={options} />);

    await user.click(screen.getByRole("combobox"));
    expect(screen.getByText("James Green")).toBeInTheDocument();
    expect(screen.getByText("Sarah Mitchell")).toBeInTheDocument();
  });

  it("applies standardised label styles", () => {
    renderWithMantine(<SelectField label="Space" data={options} />);

    const label = screen.getByText("Space");
    expect(label).toHaveStyle({
      marginBottom: remToPx("0.25rem"),
    });
    expect(label.style.fontSize).toBe("var(--mantine-font-size-md)");
    expect(label.style.color).toBe("var(--mantine-color-text)");
  });

  it("applies standardised input font size", () => {
    renderWithMantine(<SelectField label="Space" placeholder="Select" data={options} />);

    const input = screen.getByRole("combobox");
    expect(input.style.fontSize).toBe("var(--mantine-font-size-md)");
  });

  it("renders as disabled when disabled prop is set", () => {
    renderWithMantine(<SelectField label="Space" data={options} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("draws each group heading as a divider, not an option", async () => {
    // Styled centred and navy between two rules; the class is what
    // carries that, so it is what this pins
    const user = userEvent.setup();
    renderWithMantine(
      <SelectField
        label="Competency"
        data={[
          {
            group: "Oncology",
            items: [
              { value: "prescribe_sact", label: "Prescribe SACT" },
              { value: "assess_sact_toxicity", label: "Assess SACT toxicity" },
            ],
          },
          {
            group: "Others",
            items: [
              {
                value: "take_informed_consent",
                label: "Take informed consent",
              },
              { value: "request_plain_xray", label: "Request plain X-rays" },
            ],
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("combobox"));

    const heading = await screen.findByText("Oncology");
    expect(heading).toHaveClass(cssClass(dropdownClasses, "groupLabel"));
    expect(screen.queryByRole("option", { name: "Oncology" })).not.toBeInTheDocument();
  });
});
