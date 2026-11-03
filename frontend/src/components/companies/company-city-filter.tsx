"use client";

import { useState } from "react";
import { SearchableSelectionField } from "@/components/forms/selection-field";

export function CompanyCityFilter({
  cities,
  initialCity,
}: {
  cities: string[];
  initialCity: string;
}) {
  const [city, setCity] = useState(initialCity);

  return (
    <SearchableSelectionField
      id="company-city"
      label="Tỉnh / Thành phố"
      popupTitle="Địa điểm"
      placeholder="Tất cả địa điểm"
      searchLabel="Tìm tỉnh/thành phố"
      name="city"
      options={cities.map((location) => ({ value: location, label: location }))}
      value={city}
      onValueChange={setCity}
    />
  );
}
