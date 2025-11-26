import { COLOR_THEME } from "./color_theme";
import { FONT_M } from "./sizes";
import { E } from "@selfage/element/factory";
import { normalizeBody } from "./normalize_body";

normalizeBody();

const content = E.div(
  {
    style: [
      "min-height: 100vh",
      `background: linear-gradient(135deg, ${COLOR_THEME.neutral4} 0%, ${COLOR_THEME.neutral3} 100%)`,
      `color: ${COLOR_THEME.neutral0}`,
      "display: flex",
      "justify-content: center",
      "align-items: center",
      "padding: 2rem",
      "box-sizing: border-box",
    ].join("; "),
  },
  E.div(
    {
      style: [
        "max-width: 50rem",
        "width: 100%",
        `background-color: ${COLOR_THEME.neutral4}`,
        "border-radius: 1rem",
        "padding: 3rem",
        "box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.3)",
        `border: 0.0625rem solid ${COLOR_THEME.neutral3}`,
      ].join("; "),
    },
    E.h1(
      {
        style: [
          `font-size: ${FONT_M * 2.5}rem`,
          "margin: 0 0 1.5rem 0",
          "font-weight: 600",
          `color: ${COLOR_THEME.neutral0}`,
        ].join("; "),
      },
      E.text("Layra"),
    ),
    E.div(
      {
        style: [
          `background-color: ${COLOR_THEME.error3}`,
          "padding: 1rem 1.25rem",
          "border-radius: 0.5rem",
          "margin-bottom: 2rem",
        ].join("; "),
      },
      E.p(
        {
          style: [
            `font-size: ${FONT_M * 1.1}rem`,
            "margin: 0",
            "font-weight: 500",
            `color: ${COLOR_THEME.neutral0}`,
          ].join("; "),
        },
        E.text("⚠️ This is NOT an AI image generator"),
      ),
    ),
    E.h2(
      {
        style: [
          `font-size: ${FONT_M * 1.75}rem`,
          "margin: 2rem 0 1rem 0",
          "font-weight: 600",
          `color: ${COLOR_THEME.neutral0}`,
        ].join("; "),
      },
      E.text("What is Layra?"),
    ),
    E.p(
      {
        style: [
          `font-size: ${FONT_M}rem`,
          "line-height: 1.7",
          "margin: 0 0 1rem 0",
          `color: ${COLOR_THEME.neutral1}`,
        ].join("; "),
      },
      E.text(
        "Layra is a layer-based image editor with an AI-powered assistant. It offers the power of professional editing tools with an extremely simplified interface.",
      ),
    ),
    E.h2(
      {
        style: [
          `font-size: ${FONT_M * 1.75}rem`,
          "margin: 2rem 0 1rem 0",
          "font-weight: 600",
          `color: ${COLOR_THEME.neutral0}`,
        ].join("; "),
      },
      E.text("Why Layra is Different"),
    ),
    E.p(
      {
        style: [
          `font-size: ${FONT_M}rem`,
          "line-height: 1.7",
          "margin: 0 0 1rem 0",
          `color: ${COLOR_THEME.neutral1}`,
        ].join("; "),
      },
      E.text(
        "Unlike traditional image editors like Photoshop that require extensive learning and navigation through complex menus, Layra lets you simply ask the AI assistant what you want to do. No need to remember where tools are or how to use them — just describe what you want, and the assistant will handle it.",
      ),
    ),
    E.ul(
      {
        style: [
          `font-size: ${FONT_M}rem`,
          "line-height: 1.7",
          "margin: 0 0 1rem 0",
          `color: ${COLOR_THEME.neutral1}`,
          "padding-left: 1.5rem",
        ].join("; "),
      },
      E.li(
        {
          style: ["margin-bottom: 0.75rem"].join("; "),
        },
        E.text(
          "� Natural conversation interface - Ask for what you need in plain language",
        ),
      ),
      E.li(
        {
          style: ["margin-bottom: 0.75rem"].join("; "),
        },
        E.text(
          "🎯 Zero learning curve - Start editing immediately without tutorials",
        ),
      ),
      E.li(
        {
          style: ["margin-bottom: 0.75rem"].join("; "),
        },
        E.text(
          "� Privacy-first - No login required, all projects and images stay on your device",
        ),
      ),
      E.li(
        {
          style: ["margin-bottom: 0.75rem"].join("; "),
        },
        E.text(
          "🎨 Full editing power - Layer-based workflow with professional capabilities",
        ),
      ),
    ),
    E.h2(
      {
        style: [
          `font-size: ${FONT_M * 1.75}rem`,
          "margin: 2rem 0 1rem 0",
          "font-weight: 600",
          `color: ${COLOR_THEME.neutral0}`,
        ].join("; "),
      },
      E.text("How It Works"),
    ),
    E.p(
      {
        style: [
          `font-size: ${FONT_M}rem`,
          "line-height: 1.7",
          "margin: 0 0 1rem 0",
          `color: ${COLOR_THEME.neutral1}`,
        ].join("; "),
      },
      E.text(
        "Layra is a traditional image editor at its core — it doesn't generate images from scratch using AI. Instead, the AI assistant helps you use the editing tools through conversation. You load your images, and the assistant helps you edit them by interpreting your requests and executing the appropriate commands.",
      ),
    ),
    E.p(
      {
        style: [
          `font-size: ${FONT_M}rem`,
          "line-height: 1.7",
          "margin: 0 0 1rem 0",
          `color: ${COLOR_THEME.neutral1}`,
        ].join("; "),
      },
      E.text(
        "Everything happens locally in your browser. Your projects and images are saved and loaded directly from your device — no servers, no accounts, no uploads.",
      ),
    ),
    E.div(
      {
        style: [
          "text-align: center",
          "margin-top: 3rem",
        ].join("; "),
      },
      E.a(
        {
          href: "/",
          style: [
            `background-color: ${COLOR_THEME.accent2}`,
            `color: ${COLOR_THEME.neutral0}`,
            "text-decoration: none",
            "padding: 0.875rem 2rem",
            "border-radius: 0.5rem",
            "display: inline-block",
            `font-size: ${FONT_M * 1.1}rem`,
            "font-weight: 600",
            "transition: all 200ms ease",
            `border: 0.0625rem solid ${COLOR_THEME.accent3}`,
          ].join("; "),
        },
        E.text("Open Layra"),
      ),
    ),
  ),
);

document.body.appendChild(content);
