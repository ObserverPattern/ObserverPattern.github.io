const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".site-nav");
const projectModal = document.querySelector("#project-modal");
const projectDialog = document.querySelector(".project-modal__dialog");
const modalTitle = document.querySelector("#project-modal-title");
const modalEyebrow = document.querySelector("#project-modal-eyebrow");
const modalSummary = document.querySelector("#project-modal-summary");
const modalNote = document.querySelector("#project-modal-note");
const projectCards = document.querySelectorAll("[data-project]");
const modalCloseButtons = document.querySelectorAll("[data-modal-close]");
const backgroundRoots = [document.querySelector(".site-header"), document.querySelector("main")].filter(Boolean);

const projectDetails = {
  quant: {
    eyebrow: "Quant Project",
    title: "퀀트 프로젝트",
    summary:
      "숫자와 규칙을 이용해 시장의 흐름을 읽는 프로젝트입니다. 사용자가 한눈에 이해할 수 있도록 간결한 카드형 설명으로 정리했습니다.",
    note: "주의: 현재 손실이 -3퍼라서 문의는 자제바람.",
  },
  "pt-agent": {
    eyebrow: "Personal PT Agent",
    title: "개인 PT 에이전트",
    summary:
      "운동 루틴과 진행 흐름을 돕는 개인용 에이전트 프로젝트입니다. 부담 없이 보고, 현재 단계와 다음 계획을 빠르게 파악할 수 있게 구성했습니다.",
    note: "이제 2주차 진입해서 추후 리뷰를 진행하겠습니다.",
  },
};

let lastFocusedProject = null;
let modalOpen = false;

function setBackgroundState(isBlocked) {
  backgroundRoots.forEach((root) => {
    if ("inert" in root) {
      root.inert = isBlocked;
    }
    if (isBlocked) {
      root.setAttribute("aria-hidden", "true");
    } else {
      root.removeAttribute("aria-hidden");
    }
  });
}

function focusModal() {
  if (!projectDialog) return;
  projectDialog.focus();
}

function openModal(projectId) {
  const detail = projectDetails[projectId];
  if (!projectModal || !detail) return;

  modalEyebrow.textContent = detail.eyebrow;
  modalTitle.textContent = detail.title;
  modalSummary.textContent = detail.summary;
  modalNote.textContent = detail.note;

  projectModal.hidden = false;
  modalOpen = true;
  document.body.classList.add("modal-open");
  setBackgroundState(true);
  focusModal();
}

function closeModal() {
  if (!projectModal || !modalOpen) return;

  projectModal.hidden = true;
  modalOpen = false;
  document.body.classList.remove("modal-open");
  setBackgroundState(false);
  lastFocusedProject?.focus?.();
}

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

projectCards.forEach((card) => {
  card.addEventListener("click", () => {
    lastFocusedProject = card;
    openModal(card.dataset.project);
  });
});

modalCloseButtons.forEach((button) => {
  button.addEventListener("click", closeModal);
});

projectModal?.addEventListener("click", (event) => {
  if (event.target === projectModal) {
    closeModal();
  }
});

window.addEventListener("keydown", (event) => {
  if (!modalOpen) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeModal();
    return;
  }

  if (event.key !== "Tab" || !projectDialog) {
    return;
  }

  const focusables = Array.from(projectDialog.querySelectorAll("button, [href], [tabindex]:not([tabindex='-1'])")).filter(
    (element) => !element.hasAttribute("disabled")
  );

  if (focusables.length === 0) {
    event.preventDefault();
    projectDialog.focus();
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
});
