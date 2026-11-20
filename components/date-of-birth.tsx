"use client";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function DateOfBirth({ initial = "" }: { initial?: string }) {
  const [year, month, day] = initial.split("-");
  const current = new Date().getUTCFullYear();
  return <fieldset className="birth-fields">
    <legend>Date of birth</legend>
    <label>Month<select name="month" aria-label="Month" required defaultValue={Number(month) || ""}><option value="" disabled>Month</option>
      {months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>
    <label>Day<select name="day" aria-label="Day" required defaultValue={Number(day) || ""}><option value="" disabled>Day</option>
      {Array.from({ length: 31 }, (_, i) => <option key={i + 1}>{i + 1}</option>)}</select></label>
    <label>Year<select name="year" aria-label="Year" required defaultValue={year || ""}><option value="" disabled>Year</option>
      {Array.from({ length: current - 1912 }, (_, i) => <option key={current - 13 - i}>{current - 13 - i}</option>)}</select></label>
  </fieldset>;
}
