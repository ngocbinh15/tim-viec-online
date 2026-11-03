import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Link,
  Image as PdfImage,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ResumeDocument as ResumeData, SectionKey } from "../schema";
import { SECTION_LABELS } from "../templates";

const PALETTES = {
  blue: { accent: "#2357a4", tint: "#eef3fb", dark: "#172f52" },
  teal: { accent: "#166b64", tint: "#edf6f3", dark: "#183e3c" },
  slate: { accent: "#475569", tint: "#f1f4f7", dark: "#253244" },
};
function month(value: string) {
  const [year, month] = value.split("-");
  return `${month}/${year}`;
}
const singleLine = (value: string) => value.replace(/\s+/gu, " ").trim();

// Break oversized tokens without adding visible hyphens to URLs or emails.
// Bounds are conservative for our bundled font; original link targets stay intact.
function breakLongTokens(value: string, width: number, fontSize: number) {
  return value
    .split(/(\s+)/u)
    .map((word) => {
      let used = 0;
      return Array.from(word)
        .map((char) => {
          const units = /\p{M}/u.test(char)
            ? 0
            : /[ilI1.,:;'!|]/u.test(char)
              ? 0.4
              : /[a-z0-9]/u.test(char) && !/[mw]/u.test(char)
                ? 0.7
                : 1.1;
          const advance = units * fontSize;
          const prefix = used + advance > width ? "\n" : "";
          used = prefix ? advance : used + advance;
          return prefix + char;
        })
        .join("");
    })
    .join("");
}
export function ResumeDocument({
  document: doc,
  photo,
}: {
  document: ResumeData;
  photo?: string;
}) {
  const palette = PALETTES[doc.settings.accent];
  const isModern = doc.template_key === "modern";
  const isMinimal = doc.template_key === "minimal";
  const isExecutive = doc.template_key === "executive";
  const isElegant = doc.template_key === "elegant";
  const isTechnical = doc.template_key === "technical";
  const stackDates = isModern || isTechnical;
  const nameSize = isElegant ? 30 : isMinimal || isModern ? 26 : 28;
  const isSidebar = (key: SectionKey) =>
    key === "skills" || key === "languages";
  const sections = doc.settings.section_order.filter(
    (key) =>
      !doc.settings.hidden_sections.includes(key) && doc.content[key].length,
  );
  const textLength = (entry: object) =>
    Object.entries(entry).reduce(
      (length, [key, value]) =>
        length +
        (key !== "id" && !key.endsWith("month") && typeof value === "string"
          ? value.trim().length
          : 0),
      0,
    );
  const narrativeLength = sections
    .filter((key) => !isSidebar(key))
    .reduce(
      (total, key) =>
        total +
        doc.content[key]
          .map(textLength)
          .reduce((sum, length) => sum + length, 0),
      doc.content.basics.summary.trim().length,
    );
  // Short profiles stay readable across the page rather than leaving an empty column.
  const useColumns =
    (isModern || isTechnical) &&
    sections.some(isSidebar) &&
    narrativeLength >= 240;
  const fontSize = { small: 8.5, normal: 9.5, large: 10.5 }[
    doc.settings.font_size
  ];
  const styles = StyleSheet.create({
    // Keep leading on individual text nodes: inherited numeric leading is
    // scaled again when React PDF remeasures the dynamic page footer.
    page: {
      fontFamily: "ResumeVietnam",
      fontSize,
      paddingTop: isElegant ? 42 : 34,
      paddingHorizontal: 36,
      paddingBottom: 42,
      color: "#243247",
      backgroundColor: "#ffffff",
    },
    topRule: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: isModern || isTechnical ? 4 : 3,
      backgroundColor: palette.accent,
    },
    sideRule: {
      position: "absolute",
      top: 34,
      bottom: 42,
      left: 22,
      width: 2,
      backgroundColor: palette.accent,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 22,
      paddingBottom: 18,
      marginBottom: isModern || isExecutive ? 14 : 18,
      borderBottomWidth: 1,
      borderBottomColor: isMinimal || isElegant ? "#dce3eb" : palette.accent,
      backgroundColor: "#ffffff",
      ...(isExecutive
        ? {
            backgroundColor: palette.dark,
            padding: 18,
            borderBottomWidth: 0,
          }
        : {}),
    },
    identity: {
      flex: 1,
      minWidth: 0,
      ...(isMinimal ? { alignItems: "center" as const } : {}),
    },
    name: {
      fontSize: nameSize,
      fontWeight: 700,
      color: isExecutive ? "#ffffff" : palette.dark,
      lineHeight: 1.35,
    },
    headline: {
      fontSize: 11,
      marginTop: 8,
      color: isExecutive ? "#e5eefb" : palette.accent,
      lineHeight: 1.6,
    },
    photo: {
      width: isModern ? 64 : 72,
      height: isMinimal ? 72 : isModern ? 76 : 88,
      objectFit: "cover",
      borderRadius: isMinimal ? 36 : 3,
    },
    contactRow: {
      flexDirection: "row",
      justifyContent: isMinimal ? "center" : "flex-start",
      flexWrap: "wrap",
      columnGap: 14,
      rowGap: 3,
      marginTop: 12,
    },
    contactInline: {
      fontSize: 8.5,
      color: isExecutive ? "#e5eefb" : "#475569",
      textDecoration: "none",
    },
    contactStrip: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: 16,
      rowGap: 6,
      padding: 12,
      backgroundColor: palette.tint,
      marginBottom: 20,
    },
    contactValue: {
      fontSize: 8.5,
      lineHeight: 1.5,
      color: "#334155",
      textDecoration: "none",
    },
    section: { marginBottom: 12 },
    sectionHeading: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 7,
      ...(isExecutive
        ? {
            backgroundColor: palette.tint,
            paddingVertical: 1,
            paddingHorizontal: 8,
            borderLeftWidth: 3,
            borderLeftColor: palette.accent,
          }
        : {}),
    },
    title: {
      fontSize: 10,
      fontWeight: 700,
      color: isMinimal || isElegant ? palette.dark : palette.accent,
      letterSpacing: isElegant ? 1.6 : isMinimal ? 1.3 : 0.7,
      lineHeight: 1.6,
      textTransform: "uppercase",
    },
    headingRule: { flex: 1, height: 1, backgroundColor: "#dce3eb" },
    item: {
      marginBottom: isExecutive ? 6 : 8,
      ...(isElegant
        ? { borderLeftWidth: 1, borderLeftColor: "#dce3eb", paddingLeft: 14 }
        : {}),
    },
    skillItem: { marginBottom: 5 },
    skillTitle: { fontSize: fontSize - 1, fontWeight: 500, lineHeight: 1.4 },
    skillDescription: {
      fontSize: fontSize - 1,
      marginTop: 2,
      lineHeight: 1.45,
    },
    entryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
      alignItems: "flex-start",
    },
    entryTitle: {
      flex: 1,
      fontSize,
      fontWeight: 700,
      color: palette.dark,
      lineHeight: 1.5,
    },
    sub: { color: palette.accent, marginTop: 2, fontSize: fontSize - 0.5 },
    date: { color: "#526176", fontSize: 8, marginTop: 3, lineHeight: 1.6 },
    description: {
      marginTop: 5,
      fontSize,
      lineHeight: doc.settings.line_spacing === "compact" ? 1.4 : 1.55,
    },
    itemLink: {
      fontSize: 8,
      color: palette.accent,
      marginTop: 4,
      textDecoration: "none",
    },
    summary: { marginBottom: 14 },
    summaryText: {
      color: "#3e4c60",
      fontSize,
      lineHeight: doc.settings.line_spacing === "compact" ? 1.4 : 1.55,
    },
    columns: { flexDirection: "row", gap: 20 },
    sidebar: {
      width: 174,
      paddingRight: 16,
      borderRightWidth: 1,
      borderRightColor: "#dce3eb",
      ...(isTechnical
        ? {
            backgroundColor: palette.tint,
            padding: 14,
            borderRightWidth: 0,
          }
        : {}),
    },
    main: { flex: 1, minWidth: 0 },
    footer: {
      position: "absolute",
      bottom: 19,
      left: 36,
      right: 36,
      borderTopWidth: 1,
      borderTopColor: "#e3e8ef",
      paddingTop: 7,
      fontSize: 7,
      color: "#64748b",
      textAlign: "right",
    },
  });
  const basics = {
    ...doc.content.basics,
    full_name: singleLine(doc.content.basics.full_name),
    headline: singleLine(doc.content.basics.headline),
  };
  const bodyWidth = useColumns ? 329 : isElegant ? 508 : 523;
  const sidebarWidth = isTechnical ? 146 : 157;
  const headerWidth =
    523 - (photo ? (isModern ? 86 : 94) : 0) - (isExecutive ? 40 : 0);
  const nameCharacters = Array.from(basics.full_name);
  const footerName =
    nameCharacters.length > 60
      ? nameCharacters.slice(0, 59).join("") + "…"
      : basics.full_name;
  function heading(label: string) {
    return (
      <View style={styles.sectionHeading} minPresenceAhead={42} wrap={false}>
        <Text style={styles.title}>{label}</Text>
        {!isExecutive && (!isModern || !useColumns) && (
          <View style={styles.headingRule} />
        )}
      </View>
    );
  }
  const section = (key: SectionKey) => (
    <React.Fragment key={key}>
      {doc.content[key].map((item, index) => {
        const data = item as unknown as Record<string, string | boolean | null>;
        const title = singleLine(
          String(data.position || data.qualification || data.name || ""),
        );
        const sub =
          data.company ||
          data.school ||
          data.role ||
          data.issuer ||
          data.proficiency;
        const date = data.start_month
          ? `${month(String(data.start_month))} - ${data.current ? "Hiện tại" : data.end_month ? month(String(data.end_month)) : ""}`
          : data.issued_month
            ? month(String(data.issued_month))
            : "";
        const compact = !useColumns && isSidebar(key);
        return (
          <View
            key={item.id}
            style={[
              styles.item,
              key === "skills" ? styles.skillItem : {},
              index === doc.content[key].length - 1
                ? {
                    marginBottom:
                      sections
                        .filter(
                          (other) =>
                            !useColumns || isSidebar(other) === isSidebar(key),
                        )
                        .at(-1) === key
                        ? 0
                        : 12,
                  }
                : {},
            ]}
          >
            {compact ? (
              <>
                {index === 0 && heading(SECTION_LABELS[key])}
                <Text
                  style={[
                    styles.description,
                    key === "skills" ? styles.skillDescription : {},
                  ]}
                >
                  <Text
                    style={{
                      fontWeight: key === "skills" ? 500 : 700,
                      color: palette.dark,
                    }}
                  >
                    {breakLongTokens(
                      title,
                      bodyWidth,
                      key === "skills" ? fontSize - 1 : fontSize,
                    )}
                  </Text>
                  {data.detail || sub
                    ? `  ·  ${breakLongTokens(String(data.detail || sub), bodyWidth, fontSize)}`
                    : ""}
                </Text>
              </>
            ) : (
              <View minPresenceAhead={14} wrap={false}>
                {index === 0 && heading(SECTION_LABELS[key])}
                <View style={styles.entryHeader}>
                  <Text
                    style={[
                      styles.entryTitle,
                      key === "skills" ? styles.skillTitle : {},
                    ]}
                  >
                    {breakLongTokens(
                      title,
                      isSidebar(key) && useColumns
                        ? sidebarWidth
                        : bodyWidth - 90,
                      key === "skills" ? fontSize - 1 : fontSize,
                    )}
                  </Text>
                  {!stackDates && date ? (
                    <Text style={styles.date}>{date}</Text>
                  ) : null}
                </View>
                {sub ? (
                  <Text style={styles.sub}>
                    {breakLongTokens(
                      singleLine(String(sub)),
                      isSidebar(key) && useColumns ? sidebarWidth : bodyWidth,
                      fontSize - 0.5,
                    )}
                  </Text>
                ) : null}
                {stackDates && date ? (
                  <Text style={styles.date}>{date}</Text>
                ) : null}
              </View>
            )}
            {!compact && (data.description || data.detail) ? (
              <Text
                style={[
                  styles.description,
                  key === "skills" ? styles.skillDescription : {},
                ]}
                orphans={2}
                widows={2}
              >
                {breakLongTokens(
                  String(data.description || data.detail),
                  isSidebar(key) && useColumns ? sidebarWidth : bodyWidth,
                  key === "skills" ? fontSize - 1 : fontSize,
                )}
              </Text>
            ) : null}
            {data.url ? (
              <Link style={styles.itemLink} src={String(data.url)}>
                {breakLongTokens(String(data.url), bodyWidth, 8)}
              </Link>
            ) : null}
          </View>
        );
      })}
    </React.Fragment>
  );
  const contacts = [
    { label: "EMAIL", value: basics.email, url: `mailto:${basics.email}` },
    { label: "ĐIỆN THOẠI", value: singleLine(basics.phone), url: undefined },
    { label: "ĐỊA ĐIỂM", value: singleLine(basics.city), url: undefined },
    ...basics.links
      .filter((item) => item.url)
      .map((item) => ({
        label: "LIÊN KẾT",
        value: singleLine(item.label || item.url),
        url: item.url,
      })),
  ].filter((item) => item.value);
  // Long contacts must flow across pages instead of growing an unbreakable header.
  const contactsInStrip =
    isModern ||
    contacts.reduce((length, item) => length + item.value.length, 0) > 600;
  const summary = basics.summary ? (
    <View style={styles.summary}>
      {heading("Giới thiệu")}
      <Text style={styles.summaryText} orphans={2} widows={2}>
        {breakLongTokens(basics.summary, bodyWidth, fontSize)}
      </Text>
    </View>
  ) : null;
  const secondaryColumn = (
    <View style={styles.sidebar}>
      {sections.filter(isSidebar).map(section)}
    </View>
  );
  const mainColumn = (
    <View style={styles.main}>
      {summary}
      {sections.filter((key) => !isSidebar(key)).map(section)}
    </View>
  );
  return (
    <Document title={doc.name} author={basics.full_name} language="vi-VN">
      <Page size="A4" style={styles.page} wrap>
        {!isMinimal && !isElegant && <View style={styles.topRule} fixed />}
        {isElegant && <View style={styles.sideRule} fixed />}
        <View style={styles.header} wrap={false}>
          <View style={styles.identity}>
            <Text style={styles.name}>
              {breakLongTokens(basics.full_name, headerWidth, nameSize)}
            </Text>
            <Text style={styles.headline}>
              {breakLongTokens(basics.headline, headerWidth, 11)}
            </Text>
            {!contactsInStrip && (
              <View style={styles.contactRow}>
                {contacts.map((item, index) =>
                  item.url ? (
                    <Link
                      key={index}
                      src={item.url}
                      style={styles.contactInline}
                    >
                      {breakLongTokens(item.value, headerWidth, 8.5)}
                    </Link>
                  ) : (
                    <Text key={index} style={styles.contactInline}>
                      {breakLongTokens(item.value, headerWidth, 8.5)}
                    </Text>
                  ),
                )}
              </View>
            )}
          </View>
          {photo ? <PdfImage src={photo} style={styles.photo} /> : null}
        </View>
        {contactsInStrip && contacts.length > 0 && (
          <View style={styles.contactStrip}>
            {contacts.map((item, index) => (
              <View key={index} style={{ maxWidth: 499 }}>
                {item.url ? (
                  <Link src={item.url} style={styles.contactValue}>
                    {breakLongTokens(item.value, 499, 8.5)}
                  </Link>
                ) : (
                  <Text style={styles.contactValue}>
                    {breakLongTokens(item.value, 499, 8.5)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
        {useColumns ? (
          <View style={styles.columns}>
            {isTechnical ? (
              <>
                {mainColumn}
                {secondaryColumn}
              </>
            ) : (
              <>
                {secondaryColumn}
                {mainColumn}
              </>
            )}
          </View>
        ) : (
          <>
            {summary}
            {sections.map(section)}
          </>
        )}
        <Text
          fixed
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${footerName}   ·   ${pageNumber} / ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
