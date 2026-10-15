/* =========================================================
   POJOK BACA XII-4
   Data buku + data peminjaman dari Google Sheets
   ========================================================= */

/* =========================================================
   CAROUSEL BUKU FAVORIT
   ========================================================= */

const bookSlide = document.querySelector(".book-slide");
const nextButton = document.querySelector(".slider-button.next");
const prevButton = document.querySelector(".slider-button.prev");

if (bookSlide && nextButton && prevButton) {
  nextButton.addEventListener("click", function () {
    bookSlide.scrollBy({
      left: 220,
      behavior: "smooth",
    });
  });

  prevButton.addEventListener("click", function () {
    bookSlide.scrollBy({
      left: -220,
      behavior: "smooth",
    });
  });
}

/* =========================================================
   MEMBUKA DETAIL BUKU
   ========================================================= */

function openBookDetail(bookId) {
  window.location.href = "detail-buku.html?id=" + encodeURIComponent(bookId);
}

/* =========================================================
   MENU NAVBAR
   ========================================================= */

const menuKecil = document.querySelector("#menu-kecil");
const navbarNav = document.querySelector(".navbar-nav");

if (menuKecil && navbarNav) {
  menuKecil.addEventListener("click", function (event) {
    event.preventDefault();
    navbarNav.classList.toggle("active");
  });
}

/* =========================================================
   GOOGLE SHEETS
   ========================================================= */

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTdsqL2BzL4c2_dyV8jUEQPxdmPXlx9zz0lmxpj-cWfmCXeoXRlWpbAKWbCCwuDR5aStTdaam4iLUa3/pub?gid=0&single=true&output=csv";

const BORROWING_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvNcA5FZWPfUaC4vhKwNrshniDUq5aj0BWk_Is-7wyKLMgsqG-6A-R2d0XV7dRsuwdtSaXwr4zSfp6/pub?output=csv";

/* =========================================================
   DATA BUKU
   ========================================================= */

let books = {};

const BOOKS_CACHE_KEY = "pojokBacaBooks";

function saveBooksCache() {
  try {
    sessionStorage.setItem(BOOKS_CACHE_KEY, JSON.stringify(books));
  } catch (error) {
    console.warn("Cache buku tidak dapat disimpan:", error);
  }
}

function getBooksCache() {
  try {
    const cachedBooks = sessionStorage.getItem(BOOKS_CACHE_KEY);

    return cachedBooks ? JSON.parse(cachedBooks) : null;
  } catch (error) {
    return null;
  }
}

/* =========================================================
   MEMBERSIHKAN TEKS
   ========================================================= */

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\uFEFF/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/* =========================================================
   MEMBACA CSV
   ========================================================= */

function parseCSV(text) {
  const rows = [];

  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[i + 1] === "\n") {
        i++;
      }

      row.push(cell);

      if (
        row.some(function (value) {
          return value.trim() !== "";
        })
      ) {
        rows.push(row);
      }

      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);

  if (
    row.some(function (value) {
      return value.trim() !== "";
    })
  ) {
    rows.push(row);
  }

  return rows;
}

/* =========================================================
   MENGAMBIL NILAI DARI KOLOM CSV
   ========================================================= */

function getCSVValue(headers, row, columnName) {
  const wanted = normalizeText(columnName);

  const index = headers.findIndex(function (header) {
    return normalizeText(header) === wanted;
  });

  if (index === -1) {
    return "";
  }

  return String(row[index] ?? "").trim();
}

/* =========================================================
   MEMBACA DATA PEMINJAMAN
   ========================================================= */

async function loadBorrowings() {
  try {
    const url = BORROWING_CSV_URL + "&t=" + Date.now();

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Gagal mengambil data peminjaman.");
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    console.log("DATA PEMINJAMAN DARI CSV:", rows);

    if (rows.length < 2) {
      console.warn("CSV peminjaman tidak memiliki data.");
      return [];
    }

    const headers = rows[0];

    const borrowings = rows
      .slice(1)
      .map(function (row) {
        return {
          name: getCSVValue(headers, row, "Nama lengkap"),

          title: getCSVValue(headers, row, "Judul buku yang ingin dipinjam"),

          status: getCSVValue(headers, row, "Status"),

          borrowedDate: getCSVValue(headers, row, "Tanggal Dipinjam"),

          dueDate: getCSVValue(headers, row, "Batas Pengembalian"),

          returnedDate: getCSVValue(headers, row, "Tanggal Dikembalikan"),
        };
      })
      .filter(function (loan) {
        return loan.title !== "";
      });

    console.log("DATA PEMINJAMAN YANG SUDAH DIBACA:", borrowings);

    return borrowings;
  } catch (error) {
    console.error("Gagal memuat data peminjaman:", error);

    return [];
  }
}
/* =========================================================
   KONVERSI TANGGAL GOOGLE SHEETS
   ========================================================= */

function formatDateFromSheet(dateText) {
  if (!dateText) {
    return "";
  }

  const value = String(dateText).trim();

  /* Google Sheets serial number */
  if (!isNaN(value)) {
    const serial = Number(value);

    const date = new Date(
      Date.UTC(1899, 11, 30) + serial * 24 * 60 * 60 * 1000,
    );

    const day = String(date.getUTCDate()).padStart(2, "0");

    const month = String(date.getUTCMonth() + 1).padStart(2, "0");

    const year = date.getUTCFullYear();

    return day + "/" + month + "/" + year;
  }

  /* Format dd/mm/yyyy */
  const slashParts = value.split("/");

  if (slashParts.length === 3) {
    return value;
  }

  /* Format dd Oktober yyyy */
  const monthNames = [
    "januari",
    "februari",
    "maret",
    "april",
    "mei",
    "juni",
    "juli",
    "agustus",
    "september",
    "oktober",
    "november",
    "desember",
  ];

  const parts = value.split(" ");

  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);

    const month = monthNames.indexOf(normalizeText(parts[1]));

    const year = parseInt(parts[2], 10);

    if (!isNaN(day) && month !== -1 && !isNaN(year)) {
      const date = new Date(year, month, day);

      return (
        String(date.getDate()).padStart(2, "0") +
        "/" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "/" +
        date.getFullYear()
      );
    }
  }

  return "";
}

/* =========================================================
   MENAMBAH 1 HARI
   ========================================================= */

function addOneDay(dateText) {
  const formatted = formatDateFromSheet(dateText);

  if (!formatted) {
    return "";
  }

  const parts = formatted.split("/");

  const day = parseInt(parts[0], 10);

  const month = parseInt(parts[1], 10) - 1;

  const year = parseInt(parts[2], 10);

  const date = new Date(year, month, day);

  date.setDate(date.getDate() + 1);

  return (
    String(date.getDate()).padStart(2, "0") +
    "/" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "/" +
    date.getFullYear()
  );
}

/* =========================================================
   MENGGABUNGKAN DATA PEMINJAMAN
   DENGAN DATA BUKU
   ========================================================= */

async function applyBorrowingData() {
  const borrowings = await loadBorrowings();

  /* Semua buku awalnya tersedia */

  Object.values(books).forEach(function (book) {
    book.status = "Tersedia";
    book.borrowedDate = "";
    book.dueDate = "";
    book.availableDate = "";
  });

  /* Membaca satu per satu data peminjaman */

  borrowings.forEach(function (loan) {
    const loanTitle = normalizeText(loan.title);

    if (!loanTitle) {
      return;
    }

    const book = Object.values(books).find(function (item) {
      return normalizeText(item.title) === loanTitle;
    });

    /* Kalau judul tidak ditemukan */

    if (!book) {
      console.warn(
        "Judul peminjaman tidak ditemukan di database buku:",
        loan.title,
      );

      return;
    }

    const approved = normalizeText(loan.status) === "disetujui";

    const returned = normalizeText(loan.returnedDate) !== "";

    /*
        Buku dianggap dipinjam jika:
        1. Status = Disetujui
        2. Belum dikembalikan
      */

    if (approved && !returned) {
      book.status = "Dipinjam";

      book.borrowedDate = formatDateFromSheet(loan.borrowedDate);

      book.dueDate = formatDateFromSheet(loan.dueDate);

      book.availableDate = addOneDay(loan.dueDate);

      console.log("BUKU DIPINJAM:", book.title);
    }
  });
}

/* =========================================================
   MEMBACA DATA BUKU
   ========================================================= */

async function loadBooks() {
  try {
    const cachedBooks = getBooksCache();

    if (cachedBooks && Object.keys(cachedBooks).length > 0) {
      books = cachedBooks;

      await applyBorrowingData();

      return books;
    }

    const response = await fetch(CSV_URL + "&t=" + Date.now(), {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Gagal mengambil data buku.");
    }

    const csvText = await response.text();

    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      books = {};
      return books;
    }

    const headers = rows[0];

    books = {};

    rows.slice(1).forEach(function (row) {
      const id = getCSVValue(headers, row, "ID");

      const title = getCSVValue(headers, row, "Judul Buku");

      const book = {
        id: id,

        title: title,

        author: getCSVValue(headers, row, "Pengarang"),

        isbn: getCSVValue(headers, row, "ISBN"),

        place: getCSVValue(headers, row, "Tempat Terbit"),

        publisher: getCSVValue(headers, row, "Penerbit"),

        year: getCSVValue(headers, row, "Tahun Terbit"),

        source: getCSVValue(headers, row, "Sumber"),

        callNumber: getCSVValue(headers, row, "Nomor Panggil"),

        synopsis:
          getCSVValue(headers, row, "Sinopsis") ||
          getCSVValue(headers, row, "Sipnosis"),

        popular: getCSVValue(headers, row, "Populer"),

        status: getCSVValue(headers, row, "status") || "Tersedia",

        cover: getCSVValue(headers, row, "Cover"),

        borrowedDate: "",

        dueDate: "",

        availableDate: "",
      };

      /*
            Hanya memasukkan buku
            yang memiliki ID dan judul
          */

      if (book.id && book.title) {
        books[book.id] = book;
      }
    });

    console.log("DATA BUKU:", books);

    saveBooksCache();

    /*
      Setelah data buku selesai,
      baru membaca data peminjaman.
    */

    await applyBorrowingData();

    return books;
  } catch (error) {
    console.error("Gagal memuat data buku:", error);

    return {};
  }
}

/* =========================================================
   STATISTIK
   ========================================================= */

function updateStatistics() {
  const bookList = Object.values(books);

  const totalBuku = bookList.length;

  const bukuTersedia = bookList.filter(function (book) {
    return normalizeText(book.status) === "tersedia";
  }).length;

  const bukuDipinjam = bookList.filter(function (book) {
    return normalizeText(book.status) === "dipinjam";
  }).length;

  const totalElement = document.getElementById("totalBuku");

  const tersediaElement = document.getElementById("bukuTersedia");

  const dipinjamElement = document.getElementById("bukuDipinjam");

  if (totalElement) {
    totalElement.textContent = totalBuku;
  }

  if (tersediaElement) {
    tersediaElement.textContent = bukuTersedia;
  }

  if (dipinjamElement) {
    dipinjamElement.textContent = bukuDipinjam;
  }
}

/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (char) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char];
  });
}

/* =========================================================
   KARTU SEMUA BUKU
   ========================================================= */

function createBookCard(book) {
  const id = escapeHTML(book.id);

  const title = escapeHTML(book.title);

  const author = escapeHTML(book.author || "Penulis belum diisi");

  const year = escapeHTML(book.year || "-");

  const callNumber = escapeHTML(book.callNumber || "-");

  const cover = escapeHTML(book.cover || "");

  const status = normalizeText(book.status || "Tersedia");

  let statusHTML = "";

  if (status === "dipinjam") {
    const availableDate = escapeHTML(book.availableDate || "");

    statusHTML = `
      <div class="book-status dipinjam">
        Sedang Dipinjam
      </div>

      ${
        availableDate
          ? `
            <div class="book-available-date">
              Tersedia kembali: ${availableDate}
            </div>
          `
          : ""
      }
    `;
  } else {
    statusHTML = `
      <div class="book-status tersedia">
        Tersedia
      </div>
    `;
  }

  return `
    <div
      class="book-card"
      data-book-id="${id}"
      tabindex="0"
      role="button"
      aria-label="Lihat detail ${title}"
    >

      <div class="book-image">

        ${
          cover
            ? `
              <img
                src="${cover}"
                alt="Sampul ${title}"
                onerror="this.style.display='none'"
              >
            `
            : `
              <div class="book-placeholder"></div>
            `
        }

      </div>


      <div class="book-info">

        <h3>
          ${title}
        </h3>

        <p>
          ${author}
        </p>


        <div class="book-details">

          <span>
            ${year}
          </span>

          <span>
            ${callNumber}
          </span>

        </div>


        ${statusHTML}

      </div>

    </div>
  `;
}

/* =========================================================
   KARTU BUKU FAVORIT
   ========================================================= */

function createPopularCard(book) {
  const id = escapeHTML(book.id);

  const title = escapeHTML(book.title);

  const author = escapeHTML(book.author || "Penulis belum diisi");

  const cover = escapeHTML(book.cover || "");

  return `
    <div
      class="popular-book"
      data-book-id="${id}"
      tabindex="0"
      role="button"
      aria-label="Lihat detail ${title}"
    >

      ${
        cover
          ? `
            <img
              src="${cover}"
              alt="Sampul ${title}"
              onerror="this.style.display='none'"
            >
          `
          : `
            <div class="book-placeholder">
              📚
            </div>
          `
      }


      <div class="popular-book-info">

        <h3>
          ${title}
        </h3>

        <p>
          ${author}
        </p>

      </div>

    </div>
  `;
}

/* =========================================================
   MENAMPILKAN KOLEKSI BUKU
   ========================================================= */

function renderCollectionBooks() {
  const allContainer = document.querySelector("#allBooksContainer");

  const popularContainer = document.querySelector("#popularBooksContainer");

  const searchInput = document.querySelector("#searchBook");

  const allBooks = Object.values(books);

  const keyword = searchInput ? normalizeText(searchInput.value) : "";

  const filteredBooks = allBooks.filter(function (book) {
    const searchableText = [
      book.title,
      book.author,
      book.year,
      book.callNumber,
      book.isbn,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(keyword);
  });

  if (allContainer) {
    allContainer.innerHTML = filteredBooks.length
      ? filteredBooks.map(createBookCard).join("")
      : `
          <p>
            Buku tidak ditemukan.
          </p>
        `;
  }

  if (popularContainer) {
    const popularBooks = filteredBooks.filter(function (book) {
      return normalizeText(book.popular) === "ya";
    });

    popularContainer.innerHTML = popularBooks.length
      ? popularBooks.map(createPopularCard).join("")
      : `
          <p>
            Belum ada buku favorit.
          </p>
        `;
  }
}

/* =========================================================
   KLIK KARTU BUKU
   ========================================================= */

document.addEventListener("click", function (event) {
  const card = event.target.closest("[data-book-id]");

  if (card) {
    openBookDetail(card.dataset.bookId);
  }
});

/* =========================================================
   KEYBOARD
   ========================================================= */

document.addEventListener("keydown", function (event) {
  const card = event.target.closest("[data-book-id]");

  if (card && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();

    openBookDetail(card.dataset.bookId);
  }
});

/* =========================================================
   PENCARIAN
   ========================================================= */

const searchInput = document.querySelector("#searchBook");

if (searchInput) {
  searchInput.addEventListener("input", function () {
    renderCollectionBooks();
  });
}

/* =========================================================
   MEMUAT DATA WEBSITE
   ========================================================= */

const allBooksContainer = document.querySelector("#allBooksContainer");

const statisticsSection = document.querySelector(".statistics");

if (allBooksContainer || statisticsSection) {
  loadBooks().then(function () {
    if (allBooksContainer) {
      renderCollectionBooks();
    }

    if (statisticsSection) {
      updateStatistics();
    }
  });
}

/* =========================================================
   TOMBOL SALIN KODE WARNA DDC
   ========================================================= */

document.querySelectorAll(".ddc-copy").forEach(function (button) {
  button.addEventListener("click", async function () {
    const color = button.dataset.color;

    const feedback = document.querySelector("#ddcFeedback");

    try {
      await navigator.clipboard.writeText(color);

      if (feedback) {
        feedback.textContent = "Kode " + color + " berhasil disalin!";
      }
    } catch (error) {
      if (feedback) {
        feedback.textContent = "Salin kode warna ini secara manual: " + color;
      }
    }
  });
});
