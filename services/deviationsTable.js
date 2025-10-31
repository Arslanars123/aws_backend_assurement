// Minimal, self-contained renderer for Deviations table
// Fetches: /get-deviations?companyId=&projectId=&type=Static%20Report

(function () {
  const BASE_URL = "http://localhost:3000";

  function getUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      companyId: urlParams.get("companyId"),
      projectId: urlParams.get("projectId"),
      profession:
        urlParams.get("profession") || urlParams.get("subjectMatterId"),
    };
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("en-GB");
    } catch (_) {
      return iso;
    }
  }

  function createLink(href, text) {
    if (!href) return "";
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${
      text || "Open"
    }</a>`;
  }

  function renderTable(container, rows) {
    if (!container) return;

    if (!rows || rows.length === 0) {
      container.innerHTML =
        '<div style="text-align:center;padding:16px;color:#999;">No deviations found</div>';
      return;
    }

    console.log("rows how many here", rows);

    const table = document.createElement("table");
    table.className = "registrations-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Deviation No.</th>
          <th>Submitted</th>
          <th>Subject</th>
          <th>Group</th>
          <th>Building Part</th>
          <th>Description</th>
          <th>Main Drawing</th>
          <th>Child Drawings</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    rows.forEach((d) => {
      const subject = d.profession?.SubjectMatterId || "";
      const group = d.profession?.GroupName || "";
      const bpName =
        d.buildingParts?.buildingPartDetail?.name ||
        d.buildingParts?.buildingPartName ||
        "";
      const bpDesc = d.buildingParts?.buildingPartDetail?.description || "";

      const main = Array.isArray(d.drawing?.mainDrawings)
        ? d.drawing.mainDrawings
        : [];
      const child = Array.isArray(d.drawing?.childDrawings)
        ? d.drawing.childDrawings
        : [];

      const mainFirst = main[0];
      const mainHref = mainFirst
        ? mainFirst.s3Location ||
          (mainFirst.filename
            ? `${BASE_URL}/uploads/${mainFirst.filename}`
            : "")
        : "";
      const mainText = mainFirst
        ? mainFirst.originalname || "Main drawing"
        : "";

      const childLinks = child
        .map((c, i) =>
          createLink(
            c.s3Location ||
              (c.filename ? `${BASE_URL}/uploads/${c.filename}` : ""),
            c.originalname || `Child ${i + 1}`
          )
        )
        .filter(Boolean)
        .join("<br/>");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="pos-col">${d.deviationNumber || d._id || ""}</td>
        <td class="date-col">${formatDate(d.submittedDate)}</td>
        <td>${subject}</td>
        <td>${group}</td>
        <td>${bpName}</td>
        <td class="desc-col">${bpDesc}</td>
        <td class="drawing-col">${createLink(mainHref, mainText)}</td>
        <td class="drawing-col">${childLinks}</td>
      `;
      tbody.appendChild(tr);
    });

    container.innerHTML = "";
    container.appendChild(table);
  }

  async function loadDeviations() {
    const mount = document.getElementById("deviations-table");
    if (!mount) {
      console.warn("Deviations table container not found, retrying...");
      // Retry after a short delay in case DOM is still loading
      setTimeout(loadDeviations, 500);
      return;
    }

    const { companyId, projectId, profession } = getUrlParams();

    // Validate required parameters
    if (!companyId || !projectId) {
      mount.innerHTML =
        '<div style="text-align:center;padding:16px;color:#e11;">Missing companyId or projectId in URL parameters</div>';
      console.error("Missing required URL parameters: companyId, projectId");
      return;
    }

    try {
      // Type is "Static Report" for this report type
      const type = "Static Report";
      const url = `${BASE_URL}/get-deviations?companyId=${encodeURIComponent(
        companyId
      )}&projectId=${encodeURIComponent(projectId)}&type=${encodeURIComponent(
        type
      )}`;

      console.log("Fetching deviations from:", url);
      const res = await fetch(url, { mode: "cors" });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log("Deviations data received:", data);

      const rows = Array.isArray(data)
        ? data.filter(
            (d) => !profession || d.profession?.SubjectMatterId === profession
          )
        : [];

      console.log(`Rendering ${rows.length} deviation(s)`);
      renderTable(mount, rows);
    } catch (e) {
      mount.innerHTML =
        '<div style="text-align:center;padding:16px;color:#e11;">Failed to load deviations: ' +
        (e.message || "Unknown error") +
        "</div>";
      console.error("Failed to load deviations table:", e);
    }
  }

  // Wait for DOM and ensure container exists
  function initDeviationsTable() {
    // Check if container exists
    const mount = document.getElementById("deviations-table");
    if (mount) {
      loadDeviations();
    } else {
      // Container not ready, wait and retry
      console.log("Waiting for deviations-table container...");
      setTimeout(initDeviationsTable, 100);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDeviationsTable);
  } else {
    // DOM already loaded, but wait a bit for other scripts to run
    setTimeout(initDeviationsTable, 100);
  }
})();
