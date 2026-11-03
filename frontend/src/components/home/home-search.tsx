"use client";

import { useState } from "react";
import Form from "next/form";
import { MapPin, Search } from "lucide-react";
import { SearchableSelectionField } from "@/components/forms/selection-field";

export function HomeSearch({ cities }: { cities: string[] }) {
  const [city, setCity] = useState("");
  return (
    <Form
      action="/jobs"
      className="home-search"
      role="search"
      aria-label="Tìm kiếm việc làm"
    >
      <div className="home-keyword">
        <Search aria-hidden="true" size={18} />
        <label htmlFor="home-keyword" className="sr-only">
          Việc làm, công ty hoặc kỹ năng
        </label>
        <input
          id="home-keyword"
          type="text"
          name="keyword"
          placeholder="Tìm kiếm việc làm, công ty, kỹ năng"
          maxLength={200}
        />
      </div>
      <span className="home-search-divider" aria-hidden="true" />
      <div className="home-location">
        <MapPin size={15} aria-hidden="true" />
        <SearchableSelectionField
          searchLabel="Tìm tỉnh/thành phố"
          className="home-city-selection"
          label="Địa điểm tìm việc"
          placeholder="Tất cả địa điểm"
          name="city"
          value={city}
          onValueChange={setCity}
          options={cities.map((location) => ({
            value: location,
            label: location,
          }))}
        />
      </div>
      <button className="home-search-submit" type="submit">
        Tìm kiếm
      </button>
    </Form>
  );
}
