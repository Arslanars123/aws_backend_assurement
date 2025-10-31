// Fallback for html2canvas
if (typeof window.html2canvas === "undefined") {
  console.log("Loading html2canvas from CDN...");
  const script1 = document.createElement("script");
  script1.src =
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
  script1.onload = () => console.log("html2canvas loaded from CDN");
  script1.onerror = () => console.error("Failed to load html2canvas from CDN");
  document.head.appendChild(script1);
}

// Fallback for jsPDF
if (typeof window.jspdf === "undefined") {
  console.log("Loading jsPDF from CDN...");
  const script2 = document.createElement("script");
  script2.src =
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  script2.onload = () => console.log("jsPDF loaded from CDN");
  script2.onerror = () => console.error("Failed to load jsPDF from CDN");
  document.head.appendChild(script2);
}

// -----------------------------
// Configuration - Dynamic from URL parameters
// -----------------------------
const BASE_URL = "http://localhost:3000";

// Parse URL parameters
function getUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    companyId: urlParams.get("companyId") || "68f76ce994e7d41efe754dc4", // Default fallback
    projectId: urlParams.get("projectId") || "68fa70ccee0ab59dfc5f591a", // Default fallback
    subjectMatterId:
      urlParams.get("subjectMatterId") || urlParams.get("profession") || "KP13", // Default fallback
    profession:
      urlParams.get("profession") || urlParams.get("subjectMatterId") || "KP13", // Get profession parameter
    startPage: parseInt(urlParams.get("startPage")) || 1, // Starting page number
  };
}

// Get dynamic IDs from URL parameters
const {
  companyId: COMPANY_ID,
  projectId: PROJECT_ID,
  subjectMatterId: SUBJECT_MATTER_ID,
  profession: PROFESSION,
  startPage: START_PAGE,
} = getUrlParams();

// Display parameters in UI
function displayParameters() {
  const paramInfo = document.getElementById("paramInfo");
  const urlParams = new URLSearchParams(window.location.search);

  if (
    urlParams.has("companyId") ||
    urlParams.has("projectId") ||
    urlParams.has("subjectMatterId") ||
    urlParams.has("startPage")
  ) {
    paramInfo.innerHTML = `Rport Company ${COMPANY_ID}`;
  } else {
    paramInfo.innerHTML = "Using default parameters";
  }
}

// Update page numbers based on starting page
function updatePageNumbers() {
  const pages = document.querySelectorAll(".page");
  pages.forEach((page, index) => {
    const pageNumberElement = page.querySelector(".page-number");
    if (pageNumberElement) {
      const pageNumber = START_PAGE + index;
      pageNumberElement.textContent = pageNumber;
      console.log(`Page ${index + 1} will be numbered as page ${pageNumber}`);
    }
  });
}

// -----------------------------
// Data loading
// -----------------------------
async function loadData() {
  console.log("Local image source:");

  // Declare specialText at function scope so it's accessible throughout
  let specialText = "Static Control Plan"; // Default value

  try {
    // Fetch profession details
    const professionResponse = await fetch(
      `${BASE_URL}/get-professions?SubjectMatterId=${PROFESSION}`,
      { mode: "cors" }
    );
    const professionData = await professionResponse.json();
    console.log("Profession data:", professionData);

    // Populate profession information
    if (professionData && professionData.length > 0) {
      const profession = professionData[0];
      document.getElementById("professionId").textContent =
        profession.SubjectMatterId || PROFESSION;
      document.getElementById("professionGroupName").textContent =
        profession.GroupName || "";
    } else {
      document.getElementById("professionId").textContent = PROFESSION;
      document.getElementById("professionGroupName").textContent = "Not found";
    }

    // Fetch company details
    const companyResponse = await fetch(
      `${BASE_URL}/get-company-detail/${COMPANY_ID}`,
      { mode: "cors" }
    );
    const company = await companyResponse.json();
    console.log("Company data:", company);

    // Set company logo if available (prioritize S3 location)
    if (company.picture) {
      const logoContainer = document.querySelector(".company-logo-sm");
      logoContainer.innerHTML = "";

      console.log("Company picture data:", company.picture);
      console.log("S3 Location:", company.picture.s3Location);
      console.log("Filename:", company.picture.filename);

      // Simple approach - just set the image source directly
      const logoImg = document.createElement("img");

      // Add crossOrigin for PDF generation
      logoImg.crossOrigin = "anonymous";

      if (company.picture.s3Location) {
        console.log("Loading S3 image:", company.picture.s3Location);
        logoImg.src = company.picture.s3Location;
      } else if (company.picture.filename) {
        console.log(
          "Loading local image:",
          `${BASE_URL}/uploads/${company.picture.filename}`
        );
        logoImg.src = `${BASE_URL}/uploads/${company.picture.filename}`;
      }

      // Simple styling - let CSS handle the rest
      logoImg.style.maxWidth = "100%";
      logoImg.style.maxHeight = "100%";
      logoImg.style.objectFit = "contain";

      logoImg.addEventListener("load", () => {
        console.log("✅ Logo loaded successfully:", logoImg.src);
        console.log(
          "Logo dimensions:",
          logoImg.naturalWidth,
          "x",
          logoImg.naturalHeight
        );
      });

      logoImg.addEventListener("error", (e) => {
        console.log("❌ Logo failed to load:", logoImg.src, e);
        console.log("Trying fallback to local upload...");

        // Try fallback to local upload if S3 fails
        if (company.picture.s3Location && company.picture.filename) {
          logoImg.src = `${BASE_URL}/uploads/${company.picture.filename}`;
          logoImg.crossOrigin = null; // Remove CORS for local files
        } else {
          logoContainer.textContent = "Company logo";
        }
      });

      logoContainer.appendChild(logoImg);
      console.log("Logo image appended to container");
    }

    // Fetch special text
    const specialTextResponse = await fetch(
      `${BASE_URL}/get-project-special-text?projectId=${PROJECT_ID}`,
      { mode: "cors" }
    );
    const specialTextData = await specialTextResponse.json();

    specialText =
      specialTextData.success &&
      specialTextData.data &&
      specialTextData.data.specialText
        ? specialTextData.data.specialText
        : "Static Control Plan";

    // Update all Construction Part cells with special text
    document
      .querySelectorAll(".control-section-table tbody tr")
      .forEach((row) => {
        const constructionPartCell = row.querySelector("td:last-child");
        if (constructionPartCell) {
          constructionPartCell.textContent = specialText;
        }
      });

    // Fetch project details
    const projectResponse = await fetch(
      `${BASE_URL}/get-project-detail/${PROJECT_ID}`
    );
    const project = await projectResponse.json();
    console.log("Project data:", project);

    // Fetch signatures
    const signaturesResponse = await fetch(
      `${BASE_URL}/get-static-report-signatures`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: COMPANY_ID,
          projectId: PROJECT_ID,
          subjectMatterId: PROFESSION,
        }),
      }
    );
    const signaturesData = await signaturesResponse.json();
    console.log("Signatures data:", signaturesData);

    // Filter signatures by subjectMatterId to ensure only matching ones are shown
    const filteredSignatures = Array.isArray(signaturesData)
      ? signaturesData.filter((sig) => sig.subjectMatterId === PROFESSION)
      : [];
    console.log(
      "Filtered signatures by PROFESSION:",
      PROFESSION,
      filteredSignatures
    );

    // Populate project details
    if (project._id)
      document.getElementById("project-id").textContent = project._id;
    if (project.name)
      document.getElementById("project-name-full").textContent = project.name;
    if (project.address)
      document.getElementById("project-address").textContent = project.address;
    if (project.postalCode && project.city) {
      document.getElementById(
        "project-post"
      ).textContent = `${project.postalCode} ${project.city}`;
    }
    if (project.contactPerson)
      document.getElementById("project-contact").textContent =
        project.contactPerson;
    if (project.startDate)
      document.getElementById("project-startup").textContent = new Date(
        project.startDate
      ).toLocaleDateString();

    // Populate company details
    if (company.name)
      document.getElementById("company-name").textContent = company.name;
    if (company.name)
      document.getElementById("company-name-full").textContent = company.name;
    if (company.address)
      document.getElementById("company-address").textContent = company.address;
    if (company.postalCode && company.city) {
      document.getElementById(
        "company-post"
      ).textContent = `${company.postalCode} ${company.city}`;
    }
    if (company.cvr)
      document.getElementById("company-cvr").textContent = company.cvr;
    if (company.email)
      document.getElementById("company-email").textContent = company.email;
    if (company.contactPerson)
      document.getElementById("company-contact").textContent =
        company.contactPerson;

    // Update footer company name
    const footerCompanyName = document.getElementById("company-name-footer");
    if (footerCompanyName && company.name) {
      footerCompanyName.textContent = company.name;
    }

    // Fetch independent controller data
    try {
      const independentControllerResponse = await fetch(
        `${BASE_URL}/get-independent-controller?companyId=${COMPANY_ID}&projectId=${PROJECT_ID}`,
        { mode: "cors" }
      );
      const independentControllerData =
        await independentControllerResponse.json();
      console.log("Independent controller data:", independentControllerData);

      // Populate inspectors table
      const inspectorsTbody = document.getElementById("inspectors-tbody");
      if (inspectorsTbody) {
        inspectorsTbody.innerHTML = "";
        if (
          Array.isArray(independentControllerData) &&
          independentControllerData.length > 0
        ) {
          independentControllerData.forEach((inspector) => {
            const name =
              inspector.name ||
              inspector.fullName ||
              inspector.username ||
              "N/A";
            const type = inspector.type || "Independent Controller";
            const tr = document.createElement("tr");
            tr.innerHTML = `
                  <td style="border:1px solid #ddd;padding:8px;">${name}</td>
                  <td style="border:1px solid #ddd;padding:8px;">${type}</td>
                `;
            inspectorsTbody.appendChild(tr);
          });
        } else {
          inspectorsTbody.innerHTML =
            '<tr><td colspan="2" style="text-align:center;border:1px solid #ddd;padding:8px;">No inspectors found.</td></tr>';
        }
      }
    } catch (error) {
      console.log("Error fetching independent controller:", error);
      // Show error in table if exists
      const inspectorsTbody = document.getElementById("inspectors-tbody");
      if (inspectorsTbody) {
        inspectorsTbody.innerHTML =
          '<tr><td colspan="2" style="text-align:center;border:1px solid #ddd;padding:8px;color:red;">Failed to load inspector data</td></tr>';
      }
    }

    // Fetch gammas data for construction and execution classes
    try {
      const gammasResponse = await fetch(
        `${BASE_URL}/get-gammas?companyId=${COMPANY_ID}&projectId=${PROJECT_ID}`,
        { mode: "cors" }
      );
      const gammasData = await gammasResponse.json();
      console.log("Gammas data:", gammasData);
      // Concatenate all x values from gammas and update Document ID
      try {
        const xConcat = Array.isArray(gammasData)
          ? gammasData
              .map((g) => (g && g.x ? String(g.x).trim() : ""))
              .filter(Boolean)
              .join(", ")
          : "";
        const documentIdEl = document.getElementById("document-id");
        if (documentIdEl) {
          documentIdEl.textContent = xConcat ? `B3. ${xConcat}` : "B3.";
        }
      } catch (e) {
        console.log("Error concatenating gammas x values:", e);
      }

      // Fetch special text for control section
      const specialTextResponse = await fetch(
        `${BASE_URL}/get-project-special-text?projectId=${PROJECT_ID}`,
        { mode: "cors" }
      );
      const specialTextData = await specialTextResponse.json();
      console.log("Special text data:", specialTextData);

      // Filter gammas by profession.SubjectMatterId
      const filteredGammas = gammasData.filter(
        (gamma) =>
          gamma.profession && gamma.profession.SubjectMatterId === PROFESSION
      );
      console.log("Filtered gammas by profession:", PROFESSION, filteredGammas);

      // Populate construction cluster in document info table
      if (filteredGammas.length > 0 && filteredGammas[0].cc) {
        const constructionCluster = document.getElementById(
          "construction-cluster"
        );
        if (constructionCluster) {
          constructionCluster.textContent = filteredGammas[0].cc;
          console.log("Construction cluster updated to:", filteredGammas[0].cc);
        }
      }

      // Populate construction and execution table (use first index only)
      const constructionExecutionTableBody = document.getElementById(
        "construction-execution-table-body"
      );
      if (
        constructionExecutionTableBody &&
        gammasData &&
        gammasData.length > 0
      ) {
        const firstItem = gammasData[0]; // Use only first index as requested
        console.log("Using first item:", firstItem);

        // specialText is already defined at function scope, no need to redeclare
        // Just use it directly

        constructionExecutionTableBody.innerHTML = "";
        const row = document.createElement("tr");
        row.innerHTML = `
              <td>B3. ${specialText}</td>
              <td>Static Control Plan</td>
              <td>${firstItem.cc || ""}</td>
              <td>${firstItem.exc || ""}</td>
            `;
        constructionExecutionTableBody.appendChild(row);
        console.log("Construction and execution table populated with:", {
          specialText: specialText,
          cc: firstItem.cc,
          exc: firstItem.exc,
        });
      }
    } catch (error) {
      console.log("Error fetching gammas or special text data:", error);
      // Fallback if API fails
      const constructionExecutionTableBody = document.getElementById(
        "construction-execution-table-body"
      );
      if (constructionExecutionTableBody) {
        constructionExecutionTableBody.innerHTML = `
              <tr>
                <td>B3. special text</td>
                <td>Static Control Plan</td>
                <td></td>
                <td></td>
              </tr>
            `;
      }
    }

    // Fetch deviation B7 data
    try {
      const deviationResponse = await fetch(
        `${BASE_URL}/get-deviations?companyId=${COMPANY_ID}&projectId=${PROJECT_ID}&type=Static%20Report`,
        { mode: "cors" }
      );
      const deviationData = await deviationResponse.json();
      console.log("Deviation B7 data:", deviationData);

      // Filter deviations by profession.SubjectMatterId
      const filteredDeviations = Array.isArray(deviationData)
        ? deviationData.filter(
            (dev) =>
              dev.profession && dev.profession.SubjectMatterId === PROFESSION
          )
        : [];
      console.log(
        "Filtered deviations by PROFESSION:",
        PROFESSION,
        filteredDeviations
      );

      // Populate deviation container
      const deviationContainer = document.getElementById("deviation-container");
      if (deviationContainer) {
        deviationContainer.innerHTML = "";

        // Add heading and description text
        const headingDiv = document.createElement("div");
        headingDiv.style.marginBottom = "20px";

        const heading = document.createElement("h2");
        heading.textContent = "5.1 Handling of any deviations B7";
        heading.style.fontSize = "16px";
        heading.style.fontWeight = "700";
        heading.style.color = "#0a2540";
        heading.style.marginBottom = "12px";
        headingDiv.appendChild(heading);

        const descriptionText = document.createElement("p");
        descriptionText.textContent =
          "It is the Contractor's responsibility that the corrective action is carried out, and then that the independent inspector re-checks the deviations that may have occurred during the process. The list below shows in writing the registered deviations. If the list is empty, no one is registered.";
        descriptionText.style.fontSize = "11px";
        descriptionText.style.lineHeight = "1.5";
        descriptionText.style.marginBottom = "20px";
        descriptionText.style.color = "#3c5166";
        headingDiv.appendChild(descriptionText);

        deviationContainer.appendChild(headingDiv);

        if (filteredDeviations.length > 0) {
          filteredDeviations.forEach((deviation) => {
            console.log("deviation =>>>", deviation);

            // Create card
            const card = document.createElement("div");
            card.className = "deviation-card";

            // Deviation Number
            const idDiv = document.createElement("div");
            idDiv.className = "deviation-id";
            idDiv.textContent = `Deviation Number: ${
              deviation.deviationNumber || deviation._id || "N/A"
            }`;
            card.appendChild(idDiv);

            // Selected Building Part section (FIRST as requested)
            if (
              deviation.buildingParts &&
              deviation.buildingParts.buildingPartDetail
            ) {
              const buildingPartHeading = document.createElement("h3");
              buildingPartHeading.textContent = "Building Part";
              buildingPartHeading.style.fontSize = "14px";
              buildingPartHeading.style.fontWeight = "600";
              buildingPartHeading.style.color = "#0a2540";
              buildingPartHeading.style.marginBottom = "10px";
              buildingPartHeading.style.marginTop = "15px";
              card.appendChild(buildingPartHeading);

              const buildingPartDiv = document.createElement("div");
              buildingPartDiv.className = "deviation-building-part";

              // Add building part image
              if (
                deviation.buildingParts.buildingPartDetail.image &&
                deviation.buildingParts.buildingPartDetail.image.s3Location
              ) {
                const img = document.createElement("img");
                img.crossOrigin = "anonymous";
                img.src =
                  deviation.buildingParts.buildingPartDetail.image.s3Location;
                img.alt =
                  deviation.buildingParts.buildingPartDetail.name ||
                  "Building part";
                img.addEventListener("error", function () {
                  console.error(
                    "Failed to load building part image:",
                    this.src
                  );
                  console.log("Trying fallback to local upload...");

                  // Try fallback to local upload if S3 fails
                  if (
                    deviation.buildingParts.buildingPartDetail.image.filename
                  ) {
                    const localImg = document.createElement("img");
                    localImg.crossOrigin = null; // Remove CORS for local files
                    localImg.src = `${BASE_URL}/uploads/${deviation.buildingParts.buildingPartDetail.image.filename}`;
                    console.log("Base URL image test:");
                    console.log("Local image source:", localImg.src);
                    localImg.alt =
                      deviation.buildingParts.buildingPartDetail.name ||
                      "Building part";
                    this.parentNode.replaceChild(localImg, this);
                  } else {
                    buildingPartDiv.textContent = "Building part";
                  }
                });
                buildingPartDiv.appendChild(img);
              }

              // Add building part name
              if (deviation.buildingParts.buildingPartDetail.name) {
                const nameSpan = document.createElement("span");
                nameSpan.textContent =
                  deviation.buildingParts.buildingPartDetail.name;
                nameSpan.style.fontWeight = "600";
                buildingPartDiv.appendChild(nameSpan);
              }

              card.appendChild(buildingPartDiv);
            }

            // Annotated PDFs section (SECOND as requested)
            if (deviation.annotatedPdfs && deviation.annotatedPdfs.length > 0) {
              const annotatedHeading = document.createElement("h3");
              annotatedHeading.textContent = "Annotated PDFs";
              annotatedHeading.style.fontSize = "14px";
              annotatedHeading.style.fontWeight = "600";
              annotatedHeading.style.color = "#0a2540";
              annotatedHeading.style.marginBottom = "10px";
              annotatedHeading.style.marginTop = "20px";
              card.appendChild(annotatedHeading);

              const annotatedDiv = document.createElement("div");
              annotatedDiv.className = "deviation-drawing";

              deviation.annotatedPdfs.forEach((annotatedPdf, index) => {
                const pdfDiv = document.createElement("div");
                pdfDiv.style.marginBottom = "15px";

                const pdfImg = document.createElement("img");
                pdfImg.crossOrigin = "anonymous";
                pdfImg.src = annotatedPdf.s3Location;
                pdfImg.alt = `Annotated PDF ${index + 1}`;
                pdfImg.style.width = "100%";
                pdfImg.style.height = "auto";
                pdfImg.style.border = "1px solid #ddd";
                pdfImg.style.borderRadius = "4px";
                pdfImg.addEventListener("error", function () {
                  console.error("Failed to load annotated PDF:", this.src);
                  console.log("Trying fallback to local upload...");

                  // Try fallback to local upload if S3 fails
                  if (annotatedPdf.filename) {
                    const localImg = document.createElement("img");
                    localImg.crossOrigin = null; // Remove CORS for local files
                    localImg.src = `${BASE_URL}/uploads/${annotatedPdf.filename}`;
                    localImg.alt = `Annotated PDF ${index + 1}`;
                    localImg.style.width = "100%";
                    localImg.style.height = "auto";
                    localImg.style.border = "1px solid #ddd";
                    localImg.style.borderRadius = "4px";
                    this.parentNode.replaceChild(localImg, this);
                  } else {
                    const placeholder = document.createElement("p");
                    placeholder.textContent = "PDF not available";
                    placeholder.style.color = "#666";
                    placeholder.style.fontStyle = "italic";
                    this.parentNode.appendChild(placeholder);
                  }
                });
                pdfDiv.appendChild(pdfImg);
                annotatedDiv.appendChild(pdfDiv);
              });

              card.appendChild(annotatedDiv);
            }
            // Mark Pictures section (THIRD as requested)
            if (deviation.markPictures && deviation.markPictures.length > 0) {
              const markPicturesHeading = document.createElement("h3");
              markPicturesHeading.textContent = "Mark Pictures";
              markPicturesHeading.style.fontSize = "14px";
              markPicturesHeading.style.fontWeight = "600";
              markPicturesHeading.style.color = "#0a2540";
              markPicturesHeading.style.marginBottom = "10px";
              markPicturesHeading.style.marginTop = "20px";
              card.appendChild(markPicturesHeading);

              const picturesDiv = document.createElement("div");
              picturesDiv.className = "deviation-mark-pictures";

              deviation.markPictures.forEach((filename, index) => {
                const pictureItem = document.createElement("div");
                pictureItem.className = "mark-picture-item";

                // Construct URL for mark picture (assuming they're in uploads folder)
                const img = document.createElement("img");
                img.src = `${BASE_URL}/uploads/${filename}`;
                img.alt = `Mark picture ${index + 1}`;
                img.crossOrigin = null; // No CORS for local uploads (same-origin)
                img.addEventListener("error", function () {
                  console.error("Failed to load mark picture:", this.src);
                  console.log("Showing placeholder instead");

                  // Show placeholder text instead of hiding
                  const placeholder = document.createElement("div");
                  placeholder.style.cssText =
                    "width: 100%; height: 120px; background: #f0f0f0; border: 1px dashed #ddd; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;";
                  placeholder.textContent = "Image not available";
                  this.parentNode.replaceChild(placeholder, this);
                });
                pictureItem.appendChild(img);

                // Add mark label
                const indexDiv = document.createElement("div");
                indexDiv.className = "mark-picture-index";
                indexDiv.textContent =
                  deviation?.markPictureDescriptions?.[index] ||
                  `Mark ${index + 1}`;
                pictureItem.appendChild(indexDiv);

                picturesDiv.appendChild(pictureItem);
              });

              card.appendChild(picturesDiv);
            }

            deviationContainer.appendChild(card);
          });
        } else {
          // Show empty state
          deviationContainer.appendChild(document.createElement("div"));
          const emptyDiv = document.createElement("div");
          emptyDiv.style.textAlign = "center";
          emptyDiv.style.padding = "40px";
          emptyDiv.style.color = "#999";
          emptyDiv.textContent = "No deviations registered";
          deviationContainer.appendChild(emptyDiv);
        }
      }
    } catch (error) {
      console.log("Error fetching deviation B7 data:", error);
      // Fallback if API fails
      const deviationContainer = document.getElementById("deviation-container");
      if (deviationContainer) {
        deviationContainer.innerHTML = `
              <div style="text-align: center; padding: 40px; color: #999;">
                No deviations found
              </div>
            `;
      }
    }

    // Fetch drawings for control points page
    try {
      const drawingsResponse = await fetch(
        `${BASE_URL}/get-draws?companyId=${COMPANY_ID}&projectId=${PROJECT_ID}`,
        { mode: "cors" }
      );
      const drawingsData = await drawingsResponse.json();
      console.log("Drawings data:", drawingsData);

      // Populate drawings container
      const drawingsContainer = document.getElementById("drawings-container");
      if (drawingsContainer && drawingsData) {
        drawingsContainer.innerHTML = "";

        // Check if it's an array or has a data property
        const drawings = Array.isArray(drawingsData)
          ? drawingsData
          : drawingsData.data || drawingsData.mainDrawings || [];

        if (drawings.length > 0) {
          drawings.forEach((drawing) => {
            // Process each main drawing
            if (drawing.mainDrawings && Array.isArray(drawing.mainDrawings)) {
              drawing.mainDrawings.forEach((mainDrawing, index) => {
                const drawingItem = document.createElement("div");
                drawingItem.className = "drawing-item";

                // Check if it's a PDF or image
                const isPdf = mainDrawing.mimetype === "application/pdf";

                if (isPdf) {
                  // For PDF, show a simple placeholder (no PDF.js rendering to avoid CORS)
                  const pdfDiv = document.createElement("div");
                  pdfDiv.style.cssText =
                    "width: 100%; height: 150px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 8px;";
                  pdfDiv.innerHTML = `
                        <div style="font-size: 32px;">📄</div>
                        <div style="font-size: 12px; color: #666;">${mainDrawing.originalname}</div>
                        <a href="${mainDrawing.s3Location}" target="_blank" style="color: #0a2540; text-decoration: none; font-size: 12px;">View PDF</a>
                      `;
                  drawingItem.appendChild(pdfDiv);
                } else {
                  // For images, show the image
                  const img = document.createElement("img");
                  img.src = mainDrawing.s3Location || mainDrawing.path || "";
                  img.alt = mainDrawing.originalname || "Drawing";
                  img.style.cssText =
                    "width: 100%; height: 150px; object-fit: cover; border-radius: 4px;";
                  img.onerror = function () {
                    this.style.display = "none";
                  };
                  drawingItem.appendChild(img);
                }

                // Create drawing name using originalname
                const nameDiv = document.createElement("div");
                nameDiv.className = "drawing-name";
                nameDiv.textContent = mainDrawing.originalname || "Drawing";
                drawingItem.appendChild(nameDiv);

                drawingsContainer.appendChild(drawingItem);
              });
            }
          });
        } else {
          drawingsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999; grid-column: 1 / -1;">
                  No drawings found
                </div>
              `;
        }
      }
    } catch (error) {
      console.log("Error fetching drawings data:", error);
      // Fallback if API fails
      const drawingsContainer = document.getElementById("drawings-container");
      if (drawingsContainer) {
        drawingsContainer.innerHTML = `
              <div style="text-align: center; padding: 40px; color: #999; grid-column: 1 / -1;">
                No drawings found
              </div>
            `;
      }
    }

    // Fetch special control data
    try {
      const specialControlResponse = await fetch(
        `${BASE_URL}/get-special-control?companyId=${COMPANY_ID}&projectId=${PROJECT_ID}`,
        { mode: "cors" }
      );
      const specialControlData = await specialControlResponse.json();
      console.log("Special control data:", specialControlData);

      // Filter by profession.SubjectMatterId
      const filteredSpecialControls = Array.isArray(specialControlData)
        ? specialControlData.filter(
            (sc) =>
              sc.profession && sc.profession.SubjectMatterId === PROFESSION
          )
        : [];
      console.log(
        "Filtered special controls by PROFESSION:",
        PROFESSION,
        filteredSpecialControls
      );

      // Populate special control table
      const specialControlTableBody = document.getElementById(
        "special-control-table-body"
      );
      if (specialControlTableBody && filteredSpecialControls.length > 0) {
        specialControlTableBody.innerHTML = "";

        filteredSpecialControls.forEach((specialControl) => {
          // Determine "Made by" name
          let madeByName = "";
          if (specialControl.worker && specialControl.worker.name) {
            madeByName = specialControl.worker.name;
          } else if (
            specialControl.projectManager &&
            specialControl.projectManager.name
          ) {
            madeByName = specialControl.projectManager.name;
          } else if (
            specialControl.independentController &&
            (specialControl.independentController.name ||
              specialControl.independentController.fullName)
          ) {
            madeByName =
              specialControl.independentController.name ||
              specialControl.independentController.fullName;
          }

          // Get description from building parts
          const description =
            specialControl.buildingParts &&
            specialControl.buildingParts.buildingPartDetail &&
            specialControl.buildingParts.buildingPartDetail.description
              ? specialControl.buildingParts.buildingPartDetail.description
              : "";

          const row = document.createElement("tr");
          row.innerHTML = `
                <td>${specialControl._id || ""}</td>
                <td>${specialControl.comment || ""}</td>
                <td>${description}</td>
                <td>${madeByName}</td>
              `;
          specialControlTableBody.appendChild(row);
        });

        console.log(
          "Special control table populated with",
          filteredSpecialControls.length,
          "items"
        );
      }
    } catch (error) {
      console.log("Error fetching special control data:", error);
    }

    // Populate signatures
    filteredSignatures.forEach((sig) => {
      if (sig.signatureType === 1) {
        // Signature 1 - Prepared/approved by
        if (sig.name)
          document.getElementById("sig1-name").textContent = sig.name;
        if (sig.signatureDate) {
          document.getElementById("sig1-date").textContent = new Date(
            sig.signatureDate
          ).toLocaleDateString();
        }
        if (sig.signature) {
          const img = document.createElement("img");
          img.src = sig.signature;
          img.className = "signature-image";
          document.getElementById("sig1-signature").appendChild(img);
        }
        // Add description
        if (sig.description) {
          document.getElementById("sig1-desc").textContent = sig.description;
          document.getElementById("sig1-description").style.display = "grid";
        }
      } else if (sig.signatureType === 2) {
        // Signature 2 - Self-monitoring (EC)
        if (sig.name)
          document.getElementById("sig2-name").textContent = sig.name;
        if (sig.signatureDate) {
          document.getElementById("sig2-date").textContent = new Date(
            sig.signatureDate
          ).toLocaleDateString();
        }
        if (sig.signature) {
          const img = document.createElement("img");
          img.src = sig.signature;
          img.className = "signature-image";
          document.getElementById("sig2-signature").appendChild(img);
        }
        // Add description
        if (sig.description) {
          document.getElementById("sig2-desc").textContent = sig.description;
          document.getElementById("sig2-description").style.display = "grid";
        }
      } else if (sig.signatureType === 3) {
        // Signature 3 - Independent Auditor (UK)
        if (sig.name)
          document.getElementById("sig3-name").textContent = sig.name;
        if (sig.signatureDate) {
          document.getElementById("sig3-date").textContent = new Date(
            sig.signatureDate
          ).toLocaleDateString();
        }
        if (sig.signature) {
          const img = document.createElement("img");
          img.src = sig.signature;
          img.className = "signature-image";
          document.getElementById("sig3-signature").appendChild(img);
        }
        // Add description
        if (sig.description) {
          document.getElementById("sig3-desc").textContent = sig.description;
          document.getElementById("sig3-description").style.display = "grid";
        }
      }
    });

    // Load document completion status data
    await loadCompletionStatus(specialTextData);

    // Load control carried out data
    await loadControlCarriedOut();

    // Load registrations/documentation/photos
    await loadRegistrations();
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

// Load control carried out sections 7.1-7.6
async function loadControlCarriedOut() {
  try {
    // Fetch submitted entries from the new API
    const submittedEntriesResponse = await fetch(
      `${BASE_URL}/get-static-checklist-submitted-entries?projectId=${PROJECT_ID}&professionSubjectMatterId=${PROFESSION}&companyId=${COMPANY_ID}`,
      { mode: "cors" }
    );
    const submittedEntriesData = await submittedEntriesResponse.json();
    console.log("Submitted entries data:", submittedEntriesData);

    const entriesMap = submittedEntriesData.entriesMap || {};
    const staticDocumentCheckList =
      submittedEntriesData.staticDocumentCheckList || [];

    console.log("Static document checklist data:", staticDocumentCheckList);
    console.log("Entries map:", entriesMap);

    const specialTextResponse = await fetch(
      `${BASE_URL}/get-project-special-text?projectId=${PROJECT_ID}`,
      { mode: "cors" }
    );
    const specialTextData = await specialTextResponse.json();

    console.log("specialTextData", specialTextData);

    const specialText =
      specialTextData.success &&
      specialTextData.data &&
      specialTextData.data.specialText
        ? specialTextData.data.specialText
        : "";
    // Define default data for sections without data
    const defaultSectionData = {
      b1: [],
      b2: [],
      b3: [],
      b4: [],
      b5: [],
      b6: [],
    };

    // Filter and organize API data
    const apiData = {
      b1: staticDocumentCheckList.filter(
        (item) => item.DS_GroupId === "B1" && item.ItemId.startsWith("7.1")
      ),
      b2: staticDocumentCheckList.filter(
        (item) => item.DS_GroupId === "B2" && item.ItemId.startsWith("7.2")
      ),
      b3: staticDocumentCheckList.filter(
        (item) => item.DS_GroupId === "B3" && item.ItemId.startsWith("7.3")
      ),
    };

    console.log("apiData === ", apiData);

    // Populate B1, B2, B3 with API data or default
    ["b1", "b2", "b3"].forEach((section) => {
      const tbody = document.getElementById(`section-${section}-body`);
      if (tbody) {
        tbody.innerHTML = "";

        let dataToUse = apiData[section];

        // If no API data, use default
        if (!dataToUse || dataToUse.length === 0) {
          dataToUse = defaultSectionData[section];
        }

        if (dataToUse && dataToUse.length > 0) {
          dataToUse.forEach((item) => {
            const row = document.createElement("tr");

            // Get entry data if submitted
            const checklistId = item._id?.toString() || item.id;
            const entryData = entriesMap[checklistId] || {};

            // Determine status - show "Approved" only if approvedBy is true, otherwise empty
            let displayStatus = "";
            if (entryData.approvedBy) {
              displayStatus = "Approved";
            } else if (entryData.status) {
              displayStatus = entryData.status;
            }

            // Format dates (empty if no date)
            const formattedDate = entryData.date
              ? new Date(entryData.date).toLocaleDateString("en-GB")
              : "";
            const formattedApprovedDate = entryData.approvedDate
              ? new Date(entryData.approvedDate).toLocaleDateString("en-GB")
              : "";

            // Note = comment (empty if no comment)
            // Use API data if available
            if (item.ItemId) {
              row.innerHTML = `
                    <td class="pos-col">${item.ItemId}</td>
                    <td class="date-col">${formattedDate}</td>
                    <td class="desc-col">${
                      item["Contol of"] || item.description || ""
                    }</td>
                    <td class="status-col">${displayStatus}</td>
                    <td class="note-col">${item?.Subject}</td>
                    <td class="control-id-col">${
                      entryData.independentController
                        ? entryData.independentController.name ||
                          "Independent Controller"
                        : ""
                    }</td>
                  `;
            } else {
              // Use default data
              row.innerHTML = `
                    <td class="pos-col">${item.pos}</td>
                    <td class="date-col">${formattedDate}</td>
                    <td class="desc-col">${item.description}</td>
                    <td class="status-col">${displayStatus}</td>
                    <td class="note-col">${item?.Subject || ""}</td>
                    <td class="control-id-col">${
                      entryData.independentController
                        ? entryData.independentController.name ||
                          "Independent Controller"
                        : ""
                    }</td>
                  `;
            }
            tbody.appendChild(row);
          });
        }
      }
    });

    // Populate Section 9 B1, B2, B3 with same data as Section 7 but with Construction Part column
    ["b1", "b2", "b3"].forEach((section) => {
      const tbody = document.getElementById(`section-${section}-body-9`);
      console.log(`Section 9 ${section}: tbody found =`, tbody !== null);

      if (tbody) {
        tbody.innerHTML = "";

        let dataToUse = apiData[section];

        console.log(`Section 9 ${section}: dataToUse from API =`, dataToUse);

        // If no API data, use default
        if (!dataToUse || dataToUse.length === 0) {
          dataToUse = defaultSectionData[section];
          console.log(`Section 9 ${section}: using default data =`, dataToUse);
        }

        console.log(
          `Section 9 ${section}: final dataToUse length =`,
          dataToUse?.length
        );
        console.log(`Section 9 ${section}: specialText =`, specialText);

        if (dataToUse && dataToUse.length > 0) {
          console.log(
            `Section 9 ${section}: Starting to populate ${dataToUse.length} rows`
          );
          dataToUse.forEach((item, index) => {
            console.log(`Section 9 ${section}: Creating row ${index}`, item);
            const row = document.createElement("tr");

            // Get entry data if submitted
            const checklistId = item._id?.toString() || item.id;
            const entryData = entriesMap[checklistId] || {};

            // Determine status - show "Approved" only if approvedBy is true, otherwise empty
            let displayStatus = "";
            if (entryData.approvedBy) {
              displayStatus = "Approved";
            } else if (entryData.status) {
              displayStatus = entryData.status;
            }

            // Format dates (empty if no date)
            const formattedDate = entryData.date
              ? new Date(entryData.date).toLocaleDateString("en-GB")
              : "";
            const formattedApprovedDate = entryData.approvedDate
              ? new Date(entryData.approvedDate).toLocaleDateString("en-GB")
              : "";

            // Use API data if available
            if (item.ItemId) {
              row.innerHTML = `
                    <td class="pos-col">${item.ItemId}</td>
                    <td class="date-col">${formattedDate}</td>
                    <td class="desc-col">${
                      item["Contol of"] || item.description || ""
                    }</td>
                    <td class="status-col">${displayStatus}</td>
                    <td class="note-col">${item?.Subject}</td>
                    <td class="control-id-col">${
                      entryData.independentController
                        ? entryData.independentController.name ||
                          "Independent Controller"
                        : ""
                    }</td>
                    <td class="construction-part-col">${specialText}</td>
                  `;
            } else {
              // Use default data
              row.innerHTML = `
                    <td class="pos-col">${item.pos}</td>
                    <td class="date-col">${formattedDate}</td>
                    <td class="desc-col">${item.description}</td>
                    <td class="status-col">${displayStatus}</td>
                    <td class="note-col">${item?.Subject}</td>
                    <td class="control-id-col">${
                      entryData.independentController
                        ? entryData.independentController.name ||
                          "Independent Controller"
                        : ""
                    }</td>
                    <td class="construction-part-col">${specialText}</td>
                  `;
            }
            tbody.appendChild(row);
            console.log(
              `Section 9 ${section}: Row ${index} appended, tbody now has ${tbody.children.length} rows`
            );
          });
          console.log(
            `Section 9 ${section}: Finished populating. Total rows in tbody = ${tbody.children.length}`
          );
        } else {
          console.log(
            `Section 9 ${section}: No data to populate (dataToUse is empty or null)`
          );
        }
      } else {
        console.log(`Section 9 ${section}: tbody element not found!`);
      }
    });

    // Populate B4, B5, B6 with data from get-controls-of-static-report API
    try {
      // Get project EuroCodes from API
      let projectEuroCodes = [];
      try {
        const euroCodeApiUrl = `${BASE_URL}/get-project-profession-eurocodes?projectId=${PROJECT_ID}&subjectMatterId=${PROFESSION}`;
        console.log("Fetching EuroCodes from:", euroCodeApiUrl);

        const euroCodeResponse = await fetch(euroCodeApiUrl, { mode: "cors" });
        console.log("EuroCode API response status:", euroCodeResponse.status);

        const euroCodeData = await euroCodeResponse.json();
        console.log("EuroCode API response data:", euroCodeData);

        if (euroCodeData.success) {
          projectEuroCodes = euroCodeData.euroCodes || [];
          console.log(
            "✅ Successfully fetched project EuroCodes:",
            projectEuroCodes
          );
        } else {
          console.log("❌ EuroCode API returned success: false");
          console.log("Error details:", euroCodeData.error);
          console.log("Available docs:", euroCodeData.availableDocs);
        }
      } catch (euroCodeError) {
        console.error("❌ Error fetching project EuroCodes:", euroCodeError);
      }

      console.log("Project EuroCodes for B4-B6:", projectEuroCodes);

      // Get registration entries from StaticReportRegistrationEntries collection
      let registrationEntries = [];
      try {
        const registrationApiUrl = `${BASE_URL}/get-static-report-registration-entries?companyId=${COMPANY_ID}&projectId=${PROJECT_ID}&subjectMatterId=${PROFESSION}`;
        console.log("Fetching registration entries from:", registrationApiUrl);

        const registrationResponse = await fetch(registrationApiUrl, {
          mode: "cors",
        });
        const registrationData = await registrationResponse.json();

        if (
          registrationData.success &&
          registrationData.data &&
          registrationData.data.entries
        ) {
          registrationEntries = registrationData.data.entries;
          console.log(
            "✅ Successfully fetched registration entries:",
            registrationEntries
          );
        } else {
          console.log("❌ Registration entries API returned no data");
        }
      } catch (registrationError) {
        console.error(
          "❌ Error fetching registration entries:",
          registrationError
        );
      }

      // Create a map of registration entries by pos
      const registrationMap = {};
      registrationEntries.forEach((entry) => {
        const pos = entry.pos || entry.staticReportItem?.pos;
        if (pos) {
          // Determine status based on submission and approval
          let statusText = "Approved"; // Default hardcoded value
          if (entry.isSubmitted) {
            statusText = "Submitted / Approved";
          }
          // If not submitted, statusText shows "Approved" (hardcoded)

          registrationMap[pos] = {
            ...entry,
            comment: entry.comment || "",
            date: entry.submissionCreatedDate || entry.registrationDate || "",
            approvedBy: entry.approvedBy || false,
            isSubmitted: entry.isSubmitted || false,
            status: statusText,
          };
        }
      });

      console.log("Registration map:", registrationMap);

      // Call POST endpoint
      const controlsResponse = await fetch(
        `${BASE_URL}/get-controls-of-static-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectEuroCodes: projectEuroCodes,
            subjectMatterId: PROFESSION,
          }),
          mode: "cors",
        }
      );

      const controlsData = await controlsResponse.json();
      console.log("Controls data (B4, B5, B6):", controlsData);

      const controlsEntries = controlsData.entries || [];

      // Populate B4, B5, B6
      ["b4", "b5", "b6"].forEach((section) => {
        const tbody = document.getElementById(`section-${section}-body`);
        if (tbody) {
          tbody.innerHTML = "";

          // Filter controls entries by section based on pos field
          const sectionPrefix =
            "7." + (section === "b4" ? "4" : section === "b5" ? "5" : "6");
          const filteredEntries = controlsEntries.filter(
            (entry) => entry.pos && entry.pos.startsWith(sectionPrefix)
          );

          console.log(
            `Section ${section}, prefix ${sectionPrefix}, found ${filteredEntries.length} entries`
          );

          if (filteredEntries.length > 0) {
            filteredEntries.forEach((item) => {
              console.log("item is here", item);

              // Get entry data from registration map (StaticReportRegistrationEntries)
              const registrationData = registrationMap[item.pos] || {};

              // Use status from registration data (already calculated)
              let displayStatus = "Approved"; // Default hardcoded value
              if (registrationData.status) {
                displayStatus = registrationData.status;
              }

              // Format dates (empty if no date)
              const formattedDate = registrationData.date
                ? new Date(registrationData.date).toLocaleDateString("en-GB")
                : "";

              const row = document.createElement("tr");
              row.innerHTML = `
                    <td class="pos-col">${item.pos}</td>
                    <td class="date-col">${formattedDate}</td>
                    <td class="desc-col">${item.checkingThe || ""}</td>
                    <td class="status-col">${displayStatus}</td>
                    <td class="note-col">${item?.subject}</td>
                    <td class="control-id-col">Independent control of self-monitoring.</td>
                  `;
              tbody.appendChild(row);
            });
          } else {
            // Use default data if no API data
            if (defaultSectionData[section]) {
              defaultSectionData[section].forEach((item) => {
                const row = document.createElement("tr");
                row.innerHTML = `
                      <td class="pos-col">${item.pos}</td>
                      <td class="date-col"></td>
                      <td class="desc-col">${item.description}</td>
                      <td class="status-col"></td>
                      <td class="note-col">${item?.subject}</td>
                      <td class="control-id-col">Independent control of self-monitoring.</td>
                    `;
                tbody.appendChild(row);
              });
            }
          }
        }
      });
    } catch (controlsError) {
      console.error(
        "Error loading controls data for B4, B5, B6:",
        controlsError
      );
      // Fallback to default data
      ["b4", "b5", "b6"].forEach((section) => {
        const tbody = document.getElementById(`section-${section}-body`);
        if (tbody && defaultSectionData[section]) {
          tbody.innerHTML = "";

          defaultSectionData[section].forEach((item) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                  <td class="pos-col">${item.pos}</td>
                  <td class="date-col"></td>
                  <td class="desc-col">${item.description}</td>
                  <td class="status-col"></td>
                  <td class="note-col"></td>
                  <td class="control-id-col">Independent control of self-monitoring.</td>
                `;
            tbody.appendChild(row);
          });
        }
      });
    }

    // Populate Section 9 B4, B5, B6 with same data as Section 7 but with Construction Part column
    try {
      ["b4", "b5", "b6"].forEach((section) => {
        const tbody = document.getElementById(`section-${section}-body-9`);
        const section7tbody = document.getElementById(
          `section-${section}-body`
        );

        if (tbody && section7tbody) {
          tbody.innerHTML = "";

          // Get all rows from section 7 and clone them with Construction Part column
          const section7Rows = section7tbody.querySelectorAll("tr");

          section7Rows.forEach((section7Row) => {
            const cells = section7Row.querySelectorAll("td");
            if (cells.length > 0) {
              const row = document.createElement("tr");

              // Copy all cells from section 7
              let rowHtml = "";
              cells.forEach((cell) => {
                const className = cell.className;
                const content = cell.innerHTML;
                rowHtml += `<td class="${className}">${content}</td>`;
              });

              // Add Construction Part column
              rowHtml += `<td class="construction-part-col">${specialText}</td>`;

              row.innerHTML = rowHtml;
              tbody.appendChild(row);
            }
          });
        }
      });
    } catch (section9Error) {
      console.error("Error populating Section 9 B4, B5, B6:", section9Error);
    }

    console.log("Control carried out sections loaded");
  } catch (error) {
    console.error("Error loading control carried out data:", error);
  }
}

// Load document completion status
async function loadCompletionStatus(specialTextData) {
  try {
    // Get current date in proper format
    const currentDate = new Date().toLocaleDateString("da-DK");

    // Update status table with special text and current date
    const statusDate1 = document.getElementById("status-date-1");
    const statusPhase1 = document.getElementById("status-phase-1");

    if (statusDate1) {
      statusDate1.textContent = currentDate;
    }

    if (
      statusPhase1 &&
      specialTextData &&
      specialTextData.success &&
      specialTextData.data &&
      specialTextData.data.specialText
    ) {
      statusPhase1.textContent = specialTextData.data.specialText;
    }

    console.log("Document completion status loaded");
  } catch (error) {
    console.error("Error loading completion status:", error);
  }
}

// Load registrations/documentation/photos
async function loadRegistrations() {
  try {
    // Get registration entries from StaticReportRegistrationEntries collection
    const registrationApiUrl = `${BASE_URL}/get-static-report-registration-entries?companyId=${COMPANY_ID}&projectId=${PROJECT_ID}&subjectMatterId=${PROFESSION}`;
    console.log(
      "Fetching registration entries for registrations page from:",
      registrationApiUrl
    );

    const registrationResponse = await fetch(registrationApiUrl, {
      mode: "cors",
    });
    const registrationData = await registrationResponse.json();

    if (
      !registrationData.success ||
      !registrationData.data ||
      !registrationData.data.entries
    ) {
      console.log("No registration entries found");
      return;
    }

    const allEntries = registrationData.data.entries;
    console.log("Successfully fetched registration entries:", allEntries);

    // Separate worker submissions and independent controller submissions
    const workerSubmissions = [];
    const independentControllerSubmissions = [];

    allEntries.forEach((entry) => {
      // Check if entry has selectedWorkers (worker submitted)
      if (entry.selectedWorkers) {
        workerSubmissions.push(entry);
      }
      // Check if entry has independentController
      else if (entry.independentController) {
        independentControllerSubmissions.push(entry);
      }
    });

    console.log("Worker submissions:", workerSubmissions);
    console.log(
      "Independent controller submissions:",
      independentControllerSubmissions
    );

    // Populate worker submissions table
    const workerTableBody = document.querySelector(
      "#worker-submissions-table tbody"
    );
    workerSubmissions.forEach((entry) => {
      // Main row with basic info
      const row = document.createElement("tr");

      // Get first mark picture if exists
      const firstMarkPicture =
        entry.markPictures && entry.markPictures.length > 0
          ? entry.markPictures[0]
          : null;
      const markPictureUrl = firstMarkPicture
        ? `${BASE_URL}/uploads/${firstMarkPicture.filename}`
        : "";
      const markDescription = firstMarkPicture
        ? firstMarkPicture.description
        : "";

      // Get Description from staticReportItem or entry
      const description =
        entry.staticReportItem?.checkingThe ||
        entry.checkingThe ||
        entry.controloff ||
        "";

      // Get Control/ID - show worker name if available
      const controlId =
        entry.selectedWorkers && entry.selectedWorkers.length > 0
          ? entry.selectedWorkers
              .map((w) => w.name || w.fullName || "")
              .filter(Boolean)
              .join(", ")
          : "";

      row.innerHTML = `
            <td class="pos-col">${
              entry.pos || entry.staticReportItem?.pos || ""
            }</td>
            <td class="image-col">${
              markPictureUrl ? `<img src="${markPictureUrl}" />` : ""
            }</td>
            <td class="desc-col">${markDescription || ""}</td>
            <td class="desc-col">${description || ""}</td>
            <td class="control-id-col">${controlId || ""}</td>
          `;
      workerTableBody.appendChild(row);

      // Add drawings row if main drawings, building part, or annotated PDFs exist
      const hasDrawings =
        entry.drawing &&
        entry.drawing.mainDrawings &&
        entry.drawing.mainDrawings.length > 0;
      const hasBuildingPart =
        entry.buildingPart?.buildingPartImage?.s3Location ||
        entry.buildingPart?.buildingPartDetail?.image?.s3Location;
      const hasAnnotatedPdfs =
        entry.annotatedPdfs && entry.annotatedPdfs.length > 0;

      if (hasDrawings || hasBuildingPart || hasAnnotatedPdfs) {
        const drawingsRow = document.createElement("tr");
        const drawingsCell = document.createElement("td");
        drawingsCell.colSpan = 5;

        // Create drawings container
        const drawingsContainer = document.createElement("div");
        drawingsContainer.className = "drawing-container";

        // 1. Main Drawing
        if (hasDrawings) {
          entry.drawing.mainDrawings.forEach((mainDrawing, mainIndex) => {
            const drawingItem = document.createElement("div");
            drawingItem.className = "drawing-item";

            const isPdf = mainDrawing.mimetype === "application/pdf";
            const mainDrawingUrl =
              mainDrawing.s3Location ||
              `${BASE_URL}/uploads/${mainDrawing.filename}`;

            let drawingContent = "";

            if (isPdf) {
              // Use iframe for PDFs
              drawingContent = `
                    <h4>Main Drawing ${mainIndex + 1}: ${
                mainDrawing.originalname || "drawing.pdf"
              }</h4>
                    <iframe
                      src="${mainDrawingUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH"
                      width="100%"
                      height="400"
                      style="border: 1px solid #ccc;"
                      title="Main Drawing ${mainIndex + 1}"
                      scrolling="no"
                    ></iframe>
                    <a href="${mainDrawingUrl}" target="_blank">View Full Drawing</a>
                  `;
            } else {
              // Use img for images
              drawingContent = `
                    <h4>Main Drawing ${mainIndex + 1}: ${
                mainDrawing.originalname || "drawing.png"
              }</h4>
                    <img src="${mainDrawingUrl}" alt="${
                mainDrawing.originalname || "drawing"
              }" style="width: 100%; max-height: 400px; object-fit: contain; border: 1px solid #ccc; border-radius: 4px;" crossorigin="anonymous" />
                    <a href="${mainDrawingUrl}" target="_blank">View Full Image</a>
                  `;
            }

            drawingItem.innerHTML = drawingContent;
            drawingsContainer.appendChild(drawingItem);
          });
        }

        // 2. Building Part Image
        console.log("hasBuildingPart", hasBuildingPart);

        if (hasBuildingPart) {
          const buildingPartImageUrl =
            entry.buildingPart?.buildingPartImage?.s3Location ||
            entry.buildingPart?.buildingPartDetail?.image?.s3Location ||
            "";
          if (buildingPartImageUrl) {
            const buildingPartItem = document.createElement("div");
            buildingPartItem.className = "drawing-item";
            buildingPartItem.innerHTML = `
                  <h4>Building Part: ${
                    entry.buildingPart?.buildingPartDetail?.name ||
                    "Building Part"
                  }</h4>
                  <img src="${buildingPartImageUrl}" alt="Building Part" />
                  <a href="${buildingPartImageUrl}" target="_blank">View Full Image</a>
                `;
            drawingsContainer.appendChild(buildingPartItem);
          }
        }

        // 3. Annotated PDFs
        if (hasAnnotatedPdfs) {
          const annotatedItem = document.createElement("div");
          annotatedItem.className = "drawing-item";

          let annotatedContent = `<h4>Annotated Drawings</h4>`;

          entry.annotatedPdfs.forEach((annotatedPdf, index) => {
            const annotatedPdfUrl =
              annotatedPdf.s3Location ||
              `${BASE_URL}/uploads/${annotatedPdf.filename}`;

            annotatedContent += `
                  <div style="margin-bottom: 15px;">
                    <img
                        src="${annotatedPdfUrl}"
                        alt="Annotated"
                        style="width: 100%; height: auto; object-fit: contain; border: 1px solid #d1d5db; border-radius: 4px;"
                      />
                    <p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">${
                      annotatedPdf.originalname || "Annotated Drawing"
                    }</p>
                  </div>
                `;
          });

          annotatedItem.innerHTML = annotatedContent;
          drawingsContainer.appendChild(annotatedItem);
        }

        drawingsCell.appendChild(drawingsContainer);
        drawingsRow.appendChild(drawingsCell);
        workerTableBody.appendChild(drawingsRow);
      }
    });

    // Populate independent controller submissions table
    const controllerTableBody = document.querySelector(
      "#independent-controller-submissions-table tbody"
    );
    independentControllerSubmissions.forEach((entry) => {
      // Main row with basic info
      const row = document.createElement("tr");

      // Get first mark picture if exists
      const firstMarkPicture =
        entry.markPictures && entry.markPictures.length > 0
          ? entry.markPictures[0]
          : null;
      const markPictureUrl = firstMarkPicture
        ? `${BASE_URL}/uploads/${firstMarkPicture.filename}`
        : "";
      const markDescription = firstMarkPicture
        ? firstMarkPicture.description
        : "";

      // Get Description from staticReportItem or entry
      const description =
        entry.staticReportItem?.checkingThe ||
        entry.checkingThe ||
        entry.controloff ||
        "";

      // Get Control/ID - show independent controller name if available
      const controlId = entry.independentController
        ? entry.independentController.name ||
          entry.independentController.fullName ||
          "Independent Controller"
        : "";

      row.innerHTML = `
            <td class="pos-col">${
              entry.pos || entry.staticReportItem?.pos || ""
            }</td>
            <td class="image-col">${
              markPictureUrl ? `<img src="${markPictureUrl}" />` : ""
            }</td>
            <td class="desc-col">${markDescription || ""}</td>
            <td class="desc-col">${description || ""}</td>
            <td class="control-id-col">${controlId || ""}</td>
          `;
      controllerTableBody.appendChild(row);

      // Add drawings row if main drawings, building part, or annotated PDFs exist
      const hasDrawings =
        entry.drawing &&
        entry.drawing.mainDrawings &&
        entry.drawing.mainDrawings.length > 0;
      const hasBuildingPart =
        entry.buildingPart?.buildingPartImage?.s3Location ||
        entry.buildingPart?.buildingPartDetail?.image?.s3Location;
      const hasAnnotatedPdfs =
        entry.annotatedPdfs && entry.annotatedPdfs.length > 0;

      if (hasDrawings || hasBuildingPart || hasAnnotatedPdfs) {
        const drawingsRow = document.createElement("tr");
        const drawingsCell = document.createElement("td");
        drawingsCell.colSpan = 5;

        // Create drawings container
        const drawingsContainer = document.createElement("div");
        drawingsContainer.className = "drawing-container";

        // 1. Main Drawing
        if (hasDrawings) {
          entry.drawing.mainDrawings.forEach((mainDrawing, mainIndex) => {
            const drawingItem = document.createElement("div");
            drawingItem.className = "drawing-item";

            const isPdf = mainDrawing.mimetype === "application/pdf";
            const mainDrawingUrl =
              mainDrawing.s3Location ||
              `${BASE_URL}/uploads/${mainDrawing.filename}`;

            let drawingContent = "";

            if (isPdf) {
              // Use iframe for PDFs
              drawingContent = `
                    <h4>Main Drawing ${mainIndex + 1}: ${
                mainDrawing.originalname || "drawing.pdf"
              }</h4>
                    <iframe
                      src="${mainDrawingUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH"
                      width="100%"
                      height="400"
                      style="border: 1px solid #ccc;"
                      title="Main Drawing ${mainIndex + 1}"
                      scrolling="no"
                    ></iframe>
                    <a href="${mainDrawingUrl}" target="_blank">View Full Drawing</a>
                  `;
            } else {
              // Use img for images
              drawingContent = `
                    <h4>Main Drawing ${mainIndex + 1}: ${
                mainDrawing.originalname || "drawing.png"
              }</h4>
                    <img src="${mainDrawingUrl}" alt="${
                mainDrawing.originalname || "drawing"
              }" style="width: 100%; max-height: 400px; object-fit: contain; border: 1px solid #ccc; border-radius: 4px;" crossorigin="anonymous" />
                    <a href="${mainDrawingUrl}" target="_blank">View Full Image</a>
                  `;
            }

            drawingItem.innerHTML = drawingContent;
            drawingsContainer.appendChild(drawingItem);
          });
        }

        // 2. Building Part Image
        if (hasBuildingPart) {
          const buildingPartImageUrl =
            entry.buildingPart?.buildingPartImage?.s3Location ||
            entry.buildingPart?.buildingPartDetail?.image?.s3Location ||
            "";
          if (buildingPartImageUrl) {
            const buildingPartItem = document.createElement("div");
            buildingPartItem.className = "drawing-item";
            buildingPartItem.innerHTML = `
                  <h4>Building Part: ${
                    entry.buildingPart?.buildingPartDetail?.name ||
                    "Building Part"
                  }</h4>
                  <img src="${buildingPartImageUrl}" alt="Building Part" />
                  <a href="${buildingPartImageUrl}" target="_blank">View Full Image</a>
                `;
            drawingsContainer.appendChild(buildingPartItem);
          }
        }

        // 3. Annotated PDFs
        if (hasAnnotatedPdfs) {
          const annotatedItem = document.createElement("div");
          annotatedItem.className = "drawing-item";

          let annotatedContent = `<h4>Annotated Drawings</h4>`;

          entry.annotatedPdfs.forEach((annotatedPdf, index) => {
            const annotatedPdfUrl =
              annotatedPdf.s3Location ||
              `${BASE_URL}/uploads/${annotatedPdf.filename}`;

            annotatedContent += `
                  <div style="margin-bottom: 15px;">
                    <img
                      src="${annotatedPdfUrl}"
                      alt="Annotated ${index + 1}"
                      style="width: 100%; height: auto; object-fit: contain; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 5px;"
                      crossorigin="anonymous"
                    />
                    <p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">${
                      annotatedPdf.originalname || "Annotated Drawing"
                    }</p>
                  </div>
                `;
          });

          annotatedItem.innerHTML = annotatedContent;
          drawingsContainer.appendChild(annotatedItem);
        }

        drawingsCell.appendChild(drawingsContainer);
        drawingsRow.appendChild(drawingsCell);
        controllerTableBody.appendChild(drawingsRow);
      }
    });

    console.log("Registrations page loaded");
  } catch (error) {
    console.error("Error loading registrations data:", error);
  }
}

// Convert image to data URL for PDF generation
async function convertImageToDataURL(img) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    try {
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL("image/png");
      resolve(dataURL);
    } catch (error) {
      console.log("Failed to convert image to data URL:", error);
      resolve(null);
    }
  });
}

// -----------------------------
// Check if all required libraries are loaded
// -----------------------------
function checkLibraries() {
  const issues = [];

  console.log("Checking libraries...");
  console.log("window.html2canvas:", typeof window.html2canvas);
  console.log("window.jspdf:", typeof window.jspdf);

  // Check for html2canvas function
  if (typeof window.html2canvas !== "function") {
    issues.push("html2canvas not loaded");
  }

  // Check for jsPDF object and its jsPDF property
  if (
    typeof window.jspdf === "undefined" ||
    typeof window.jspdf.jsPDF === "undefined"
  ) {
    issues.push("jsPDF not loaded");
  }

  if (issues.length > 0) {
    console.error("Library loading issues:", issues);
    return false;
  }

  console.log("All libraries loaded successfully");
  return true;
}

// -----------------------------
// Wait for all images to load
// -----------------------------
async function waitForAllImages() {
  return new Promise((resolve) => {
    const images = document.querySelectorAll("img");
    let loaded = 0;
    const total = images.length;

    if (total === 0) {
      resolve();
      return;
    }

    const checkComplete = () => {
      loaded++;
      if (loaded === total) {
        console.log("All images loaded");
        resolve();
      }
    };

    images.forEach((img) => {
      if (img.complete) {
        checkComplete();
      } else {
        img.addEventListener("load", checkComplete);
        img.addEventListener("error", checkComplete);
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      console.log("Timeout waiting for images");
      resolve();
    }, 10000);
  });
}

// -----------------------------
// Export to PDF (jsPDF + html2canvas)
// -----------------------------
async function exportToPDF() {
  console.log("Export to PDF function called");
  const statusEl = document.getElementById("status");
  const btn = document.getElementById("exportBtn");
  try {
    btn.disabled = true;
    statusEl.textContent = "Rendering…";
    console.log("Starting PDF export...");

    // Check if all libraries are loaded
    if (!checkLibraries()) {
      throw new Error(
        "Required libraries not loaded. Please refresh the page and try again."
      );
    }

    // Ensure dynamic content is loaded (images may still be decoding)
    await document.fonts?.ready;
    console.log("Fonts loaded");

    // Wait for all images to load or fail
    const imagePromises = Array.from(document.images)
      .filter((img) => !img.complete)
      .map(
        (img) =>
          new Promise((res) => {
            console.log("Waiting for image:", img.src);
            img.addEventListener(
              "load",
              () => {
                console.log("Image loaded:", img.src);
                res();
              },
              { once: true }
            );
            img.addEventListener(
              "error",
              (e) => {
                console.log("Image failed to load:", img.src, e);
                res(); // Continue even if image fails
              },
              { once: true }
            );
          })
      );

    await Promise.all(imagePromises);
    console.log("All images processed");

    // Special handling for company logo - ensure it's loaded
    const companyLogo = document.querySelector(".company-logo-sm img");
    if (companyLogo) {
      console.log("Company logo found, checking if loaded...");
      if (!companyLogo.complete || companyLogo.naturalWidth === 0) {
        console.log("Company logo not ready, waiting...");
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.log("Company logo timeout, proceeding anyway");
            resolve();
          }, 3000);

          companyLogo.addEventListener(
            "load",
            () => {
              clearTimeout(timeout);
              console.log("Company logo loaded successfully");
              resolve();
            },
            { once: true }
          );

          companyLogo.addEventListener(
            "error",
            () => {
              clearTimeout(timeout);
              console.log("Company logo failed to load");
              resolve();
            },
            { once: true }
          );
        });
      }
    }

    // Try to convert ALL images to data URLs to ensure they're captured
    const allImages = Array.from(document.images);

    console.log("Found images to convert:", allImages.length);

    // Specifically check deviation images
    const deviationImages = Array.from(
      document.querySelectorAll("#deviation-container img")
    );
    console.log("Deviation images found:", deviationImages.length);
    deviationImages.forEach((img, idx) => {
      console.log(
        `Deviation image ${idx + 1}: src=${img.src.substring(
          0,
          80
        )}, complete=${img.complete}, naturalWidth=${img.naturalWidth}`
      );
    });

    for (const img of allImages) {
      try {
        // Check if image is already a data URL
        if (!img.src.startsWith("data:")) {
          console.log(
            "Converting image to data URL:",
            img.src.substring(0, 80)
          );

          // Wait for image to load if not ready
          if (!img.complete || img.naturalWidth === 0) {
            console.log("Waiting for image to load:", img.src.substring(0, 80));
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(resolve, 3000); // 3 second timeout
              img.onload = () => {
                clearTimeout(timeout);
                resolve();
              };
              img.onerror = () => {
                clearTimeout(timeout);
                reject();
              };
            });
          }

          const dataURL = await convertImageToDataURL(img);
          if (dataURL) {
            img.src = dataURL;
            console.log(
              "Image converted to data URL successfully, length:",
              dataURL.length
            );
          } else {
            console.log("Failed to convert image to data URL");
          }
        } else {
          console.log("Image already a data URL");
        }
      } catch (error) {
        console.error(
          "Error converting image:",
          error,
          "src:",
          img.src.substring(0, 80)
        );
      }
    }

    // Check if deviation container has content
    const deviationContainer = document.getElementById("deviation-container");
    console.log("Deviation container:", deviationContainer);
    console.log(
      "Deviation container HTML:",
      deviationContainer
        ? deviationContainer.innerHTML.substring(0, 200)
        : "null"
    );
    console.log(
      "Deviation container children:",
      deviationContainer ? deviationContainer.children.length : 0
    );
    console.log("Total images after conversion:", document.images.length);
    console.log("Images by source:");
    Array.from(document.images).forEach((img, idx) => {
      console.log(
        `Image ${idx + 1}: src starts with data? ${img.src.startsWith(
          "data:"
        )}, src: ${img.src.substring(0, 80)}`
      );
    });

    // Wait for all images to load
    await waitForAllImages();
    console.log("All images loaded, starting PDF generation...");

    // CRITICAL: Wait for all fallback images to load (local uploads after S3 failures)
    console.log("Waiting for fallback images to load...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Now re-convert ALL images to data URLs (including fallbacks)
    console.log("Re-converting all images to data URLs after fallbacks...");
    const allImagesFinal = Array.from(document.images);
    for (const img of allImagesFinal) {
      if (!img.src.startsWith("data:")) {
        try {
          const dataURL = await convertImageToDataURL(img);
          if (dataURL) {
            img.src = dataURL;
            console.log("Re-converted image to data URL");
          }
        } catch (e) {
          console.log("Could not re-convert image");
        }
      }
    }

    // Final delay to ensure everything is settled
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

    const pages = document.querySelectorAll(".page");
    console.log(`Found ${pages.length} pages to process`);

    for (let i = 0; i < pages.length; i++) {
      const el = pages[i];
      console.log(`Processing page ${i + 1}`);

      // Temporarily hide the export bar (already sticky) to avoid capture
      const exportBar = document.getElementById("exportBar");
      const prevDisplay = exportBar.style.display;
      exportBar.style.display = "none";

      // Render DOM to canvas
      const canvas = await html2canvas(el, {
        scale: 2, // sharp text
        useCORS: true, // allow external logos (needs CORS headers)
        allowTaint: true,
        backgroundColor: "#ffffff",
        windowWidth: Math.max(
          document.documentElement.clientWidth,
          el.scrollWidth
        ),
        logging: false, // Disable logging to reduce noise
        onclone: (clonedDoc) => {
          console.log("Canvas cloned document");
          // Handle any remaining images that might not be converted
          clonedDoc.querySelectorAll("img").forEach((clonedImg) => {
            if (
              !clonedImg.src.startsWith("data:") &&
              clonedImg.src.includes("s3.amazonaws.com")
            ) {
              console.log(
                "Found unconverted S3 image in cloned doc, replacing with placeholder"
              );
              clonedImg.style.display = "none";
            }
          });
        },
        imageTimeout: 0, // Don't timeout on images
      });

      console.log("Canvas rendered:", canvas.width, "x", canvas.height);

      // Restore
      exportBar.style.display = prevDisplay;

      // Fit to A4 (portrait)
      const imgData = canvas.toDataURL("image/png");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = pdfW;
      const imgH = canvas.height * (imgW / canvas.width);

      if (i > 0) pdf.addPage("a4", "p");
      pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);

      // If content is taller than one page (rare here since we sized A4),
      // you could optionally slice and spill over. The current design matches A4.
      if (imgH > pdfH + 0.5) {
        // Optional: Implement slicing if you expect overflow.
        console.warn(
          "Content exceeds one page; consider adding slicing logic if needed."
        );
      }
    }

    // Filename from title or fallback
    const title = (
      document.querySelector("title")?.textContent || "complete-static-report"
    )
      .replace(/[\\/:*?"<>|]/g, "")
      .trim();
    const filename = `${title}.pdf`;

    statusEl.textContent = "Saving…";
    console.log("Saving PDF:", filename);
    pdf.save(filename);
    statusEl.textContent = "Done.";
    console.log("PDF export completed successfully");
  } catch (err) {
    console.error("PDF export error:", err);
    console.error("Error stack:", err.stack);
    statusEl.textContent = `Failed to export: ${err.message}`;
  } finally {
    document.getElementById("exportBtn").disabled = false;
    setTimeout(() => (statusEl.textContent = ""), 2000);
  }
}

// Load data when page loads
window.addEventListener("DOMContentLoaded", async () => {
  // Display parameters in UI
  displayParameters();

  // Update page numbers
  updatePageNumbers();

  await loadData();

  // Wait longer for all scripts to load and add retry mechanism
  let attempts = 0;
  const maxAttempts = 10;

  const enableExportButton = () => {
    attempts++;
    console.log(`Attempt ${attempts}/${maxAttempts} to enable export button`);

    if (checkLibraries()) {
      document
        .getElementById("exportBtn")
        .addEventListener("click", exportToPDF);
      console.log("Export button ready - libraries loaded");
    } else if (attempts < maxAttempts) {
      console.log("Libraries not ready, retrying in 500ms...");
      setTimeout(enableExportButton, 500);
    } else {
      console.warn(
        "Libraries not ready after max attempts, enabling button anyway"
      );
      document
        .getElementById("exportBtn")
        .addEventListener("click", exportToPDF);
    }
  };

  // Start checking after 1 second
  setTimeout(enableExportButton, 1000);
});
