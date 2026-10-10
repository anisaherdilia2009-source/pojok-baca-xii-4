/* POJOK BACA XII-4 Data buku terhubung ke Google Sheets*/

/* CAROUSEL BUKU FAVORIT */

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

/* MEMBUKA DETAIL BUKU */

function openBookDetail(bookId) {
  window.location.href = "detail-buku.html?id=" + encodeURIComponent(bookId);
}

/* MENU NAVBAR */

const menuKecil = document.querySelector("#menu-kecil");
const navbarNav = document.querySelector(".navbar-nav");

if (menuKecil && navbarNav) {
  menuKecil.addEventListener("click", function (event) {
    event.preventDefault();
    navbarNav.classList.toggle("active");
  });
}

/* GOOGLE SHEETS */

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTdsqL2BzL4c2_dyV8jUEQPxdmPXlx9zz0lmxpj-cWfmCXeoXRlWpbAKWbCCwuDR5aStTdaam4iLUa3/pub?gid=0&single=true&output=csv";
// Tempat menyimpan data buku

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

/* MEMBACA DATA BUKU DARI GOOGLE SHEETS */

async function loadBooks() {
  try {
const response = await fetch(
  CSV_URL + "&t=" + Date.now(),
  { cache: "no-store" }
);

    if (!response.ok) {
      throw new Error("Gagal mengambil data dari Google Sheets.");
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      books = {};
      return books;
    }

    const headers = rows[0].map(function (header) {
      return header
        .trim()
        .replace(/^\uFEFF/, "")
        .toLowerCase();
    });

    function getValue(row, name) {
      const index = headers.indexOf(name.toLowerCase());

      return index === -1 ? "" : (row[index] || "").trim();
    }

    books = {};

    rows.slice(1).forEach((row) => {
      const id = getValue(row, "ID");

      const book = {
        id: id,
        title: getValue(row, "Judul Buku"),
        author: getValue(row, "Pengarang"),
        isbn: getValue(row, "ISBN"),
        place: getValue(row, "Tempat Terbit"),
        publisher: getValue(row, "Penerbit"),
        year: getValue(row, "Tahun Terbit"),
        source: getValue(row, "Sumber"),
        callNumber: getValue(row, "Nomor Panggil"),

        // Mendukung kedua ejaan kolom sinopsis
        synopsis: getValue(row, "Sinopsis") || getValue(row, "Sipnosis"),

        popular: getValue(row, "Populer"),
        status: getValue(row, "status") || "Tersedia",

        // Nama foto mengikuti ID buku
        cover: getValue(row, "Cover"),
      };

      if (book.id && book.title) {
        books[book.id] = book;
      }
    });

    console.log("Data buku berhasil dimuat:", books);
    saveBooksCache();
    return books;
  } catch (error) {
    console.error("Gagal memuat data buku:", error);
    return {};
  }
}

// MEMPERBARUI STATISTIK BERANDA
function updateStatistics() {
  const bookList = Object.values(books);

  const totalBuku = bookList.length;

  const bukuTersedia = bookList.filter(
    (book) => (book.status || "Tersedia").trim().toLowerCase() === "tersedia",
  ).length;

  const bukuDipinjam = bookList.filter(
    (book) => (book.status || "").trim().toLowerCase() === "dipinjam",
  ).length;

  const totalElement = document.getElementById("totalBuku");
  const tersediaElement = document.getElementById("bukuTersedia");
  const dipinjamElement = document.getElementById("bukuDipinjam");

  if (totalElement) totalElement.textContent = totalBuku;
  if (tersediaElement) tersediaElement.textContent = bukuTersedia;
  if (dipinjamElement) dipinjamElement.textContent = bukuDipinjam;
}

/* MEMBACA CSV, TERMASUK TEKS YANG MENGANDUNG KOMA */

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

/* MENGAMANKAN TEKS DARI SPREADSHEET */

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

/* MEMBUAT KARTU SEMUA BUKU */

function createBookCard(book) {
  const id = escapeHTML(book.id);
  const title = escapeHTML(book.title);
  const author = escapeHTML(book.author || "Penulis belum diisi");
  const year = escapeHTML(book.year || "-");
  const callNumber = escapeHTML(book.callNumber || "-");
  const cover = escapeHTML(book.cover || "");

  return `
    <div class="book-card"
         data-book-id="${id}"
         tabindex="0"
         role="button"
         aria-label="Lihat detail ${title}">

      <div class="book-image">
        ${
          cover
            ? `<img src="${cover}"
                   alt="Sampul ${title}"
                   onerror="this.style.display='none'">`
            : `<div class="book-placeholder">📚</div>`
        }
      </div>

      <div class="book-info">
        <h3>${title}</h3>
        <p>${author}</p>

        <div class="book-details">
          <span>${year}</span>
          <span>${callNumber}</span>
        </div>
      </div>
    </div>
  `;
}
/* MEMBUAT KARTU BUKU FAVORIT */

function createPopularCard(book) {
  const id = escapeHTML(book.id);
  const title = escapeHTML(book.title);
  const author = escapeHTML(book.author || "Penulis belum diisi");
  const cover = escapeHTML(book.cover || "");

  return `
    <div class="popular-book"
         data-book-id="${id}"
         tabindex="0"
         role="button"
         aria-label="Lihat detail ${title}">

      ${
        cover
          ? `<img src="${cover}"
                  alt="Sampul ${title}"
                  onerror="this.style.display='none'">`
          : `<div class="book-placeholder">📚</div>`
      }

      <div class="popular-book-info">
        <h3>${title}</h3>
        <p>${author}</p>
      </div>

    </div>
  `;
}

/* MENAMPILKAN BUKU DI HALAMAN KOLEKSI */

function renderCollectionBooks() {
  const allContainer = document.querySelector("#allBooksContainer");

  const popularContainer = document.querySelector("#popularBooksContainer");

  const searchInput = document.querySelector("#searchBook");

  const allBooks = Object.values(books);

  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";

  // Mencari judul, penulis, tahun, dan nomor DDC
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

  // Menampilkan semua buku
  if (allContainer) {
    allContainer.innerHTML = filteredBooks.length
      ? filteredBooks.map(createBookCard).join("")
      : "<p>Buku tidak ditemukan.</p>";
  }

  // Menampilkan buku yang ditandai Ya di kolom Populer
  if (popularContainer) {
    const popularBooks = filteredBooks.filter(function (book) {
      return book.popular.trim().toLowerCase() === "ya";
    });

    popularContainer.innerHTML = popularBooks.length
      ? popularBooks.map(createPopularCard).join("")
      : "<p>Belum ada buku favorit.</p>";
  }
}

/* KLIK KARTU UNTUK MEMBUKA DETAIL BUKU */

document.addEventListener("click", function (event) {
  const card = event.target.closest("[data-book-id]");

  if (card) {
    openBookDetail(card.dataset.bookId);
  }
});

/* MEMBUKA DETAIL DENGAN TOMBOL KEYBOARD */

document.addEventListener("keydown", function (event) {
  const card = event.target.closest("[data-book-id]");

  if (card && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openBookDetail(card.dataset.bookId);
  }
});

/* FITUR PENCARIAN BUKU */

const searchInput = document.querySelector("#searchBook");

if (searchInput) {
  searchInput.addEventListener("input", function () {
    renderCollectionBooks();
  });
}

/* MEMUAT BUKU DAN MEMPERBARUI STATISTIK */

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

/* TOMBOL SALIN KODE WARNA DDC */
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
        feedback.textContent =
          "Salin kode warna ini secara manual: " + color;
      }
    }
  });
});
