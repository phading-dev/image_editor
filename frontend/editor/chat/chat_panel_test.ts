import { GENERATE_CONTENT_REQUEST_BODY } from "../../../service_interface/interface";
import { normalizeBody } from "../../normalize_body";
import { ChatPanel } from "./chat_panel";
import { eqMessage } from "@selfage/message/test_matcher";
import { keyboardDown, keyboardType, keyboardUp, setViewport } from "@selfage/puppeteer_test_executor_api";
import { TEST_RUNNER, TestCase } from "@selfage/puppeteer_test_runner/runner";
import { asyncAssertScreenshot } from "@selfage/screenshot_test_matcher";
import { assertThat, eq } from "@selfage/test_matcher";
import { WebServiceClientMock } from "@selfage/web_service_client/client_mock";

normalizeBody();

class CountingWebServiceClientMock extends WebServiceClientMock {
  public callCount = 0;
  public async send(request: any, options?: any): Promise<any> {
    this.callCount++;
    return super.send(request, options);
  }
}

TEST_RUNNER.run({
  name: "ChatPanelTest",
  environment: {
    setUp() {
      document.body.style.height = "100vh";
    },
    tearDown() {
      document.body.style.height = "";
    },
  },
  cases: [
    new (class implements TestCase {
      public name = "creates and initializes ChatPanel";
      public cut: ChatPanel;
      private client = new WebServiceClientMock();
      public async execute() {
        // Arrange
        this.cut = new ChatPanel(this.client, "some-model");

        // Act
        await setViewport(600, 600);
        document.body.appendChild(this.cut.element);

        // Assert
        await asyncAssertScreenshot(
          __dirname + "/chat_panel_test.create_and_initialize.png",
          __dirname + "/golden/chat_panel_test.create_and_initialize.png",
          __dirname + "/chat_panel_test.create_and_initialize.diff.png",
        );
      }
      public tearDown() {
        this.cut.remove();
      }
    })(),
    new (class implements TestCase {
      public name = "does nothing when send clicked with empty input";
      private cut: ChatPanel;
      private client = new WebServiceClientMock();
      public async execute() {
        // Arrange
        this.cut = new ChatPanel(this.client, "test-model");
        await setViewport(600, 600);
        document.body.appendChild(this.cut.element);

        // Act
        this.cut.sendButton.click();

        // Assert
        assertThat(this.client.request, eq(undefined), "request undefined");
        await asyncAssertScreenshot(
          __dirname + "/chat_panel_test.empty_input.png",
          __dirname + "/golden/chat_panel_test.create_and_initialize.png",
          __dirname + "/chat_panel_test.empty_input.diff.png",
        );
      }
      public tearDown(): void {
        this.cut.remove();
      }
    })(),
    new (class implements TestCase {
      public name = "sends request and renders assistant response";
      private cut: ChatPanel;
      private client = new WebServiceClientMock();
      public async execute() {
        // Arrange
        this.cut = new ChatPanel(this.client, "model-x");
        await setViewport(600, 600);
        document.body.appendChild(this.cut.element);
        this.client.response = {
          responseJson: JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: "Hello from Gemini" }],
                },
              },
            ],
          }),
        };

        // Act
        this.cut.input.value = "Tell me a joke";
        this.cut.sendButton.click();
        await new Promise<void>((resolve) =>
          this.cut.once("messageSent", resolve),
        );

        // Assert
        assertThat(this.client.request != null, eq(true), "request exists");
        assertThat(
          this.client.request.body,
          eqMessage(
            {
              model: "model-x",
              contentsJson: JSON.stringify([
                {
                  role: "user",
                  parts: [{ text: "Tell me a joke" }],
                },
              ]),
            },
            GENERATE_CONTENT_REQUEST_BODY,
          ),
          "request body",
        );
        await asyncAssertScreenshot(
          __dirname + "/chat_panel_test.success.png",
          __dirname + "/golden/chat_panel_test.success.png",
          __dirname + "/chat_panel_test.success.diff.png",
        );
      }
      public tearDown(): void {
        this.cut.remove();
      }
    })(),
    new (class implements TestCase {
      public name = "shows error message when request fails";
      private cut: ChatPanel;
      private client = new WebServiceClientMock();
      public async execute() {
        // Arrange
        this.cut = new ChatPanel(this.client, "model-error");
        await setViewport(600, 600);
        document.body.appendChild(this.cut.element);
        this.client.error = new Error("Network exploded");

        // Act
        this.cut.input.value = "Cause failure";
        this.cut.sendButton.click();
        await new Promise<void>((resolve) =>
          this.cut.once("messageSent", resolve),
        );

        // Assert
        assertThat(this.client.request != null, eq(true), "request exists");
        assertThat(
          this.client.request.body,
          eqMessage(
            {
              model: "model-error",
              contentsJson: JSON.stringify([
                {
                  role: "user",
                  parts: [{ text: "Cause failure" }],
                },
              ]),
            },
            GENERATE_CONTENT_REQUEST_BODY,
          ),
          "request body",
        );
        await asyncAssertScreenshot(
          __dirname + "/chat_panel_test.error.png",
          __dirname + "/golden/chat_panel_test.error.png",
          __dirname + "/chat_panel_test.error.diff.png",
        );
      }
      public tearDown(): void {
        this.cut.remove();
      }
    })(),
    new (class implements TestCase {
      public name = "handles shift+enter before sending";
      private cut: ChatPanel;
      private client = new WebServiceClientMock();
      public async execute() {
        // Arrange
        this.cut = new ChatPanel(this.client, "model-shift");
        await setViewport(600, 600);
        document.body.appendChild(this.cut.element);

        // Act - typing with shift+enter
        this.cut.input.focus();
        await keyboardType("Hello, world!");
        await keyboardDown("Shift");
        await keyboardDown("Enter");
        await keyboardUp("Enter");
        await keyboardUp("Shift");
        await keyboardType("Second line");
        let expectedPrompt = this.cut.input.value;

        // Assert pre-send
        assertThat(this.client.request, eq(undefined), "request undefined");
        await asyncAssertScreenshot(
          __dirname + "/chat_panel_test.shift_before.png",
          __dirname + "/golden/chat_panel_test.shift_before.png",
          __dirname + "/chat_panel_test.shift_before.diff.png",
        );

        // Act
        this.client.response = {
          responseJson: JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: "Shift acknowledged." }],
                },
              },
            ],
          }),
        };
        this.cut.sendButton.click();
        await new Promise<void>((resolve) =>
          this.cut.once("messageSent", resolve),
        );

        // Assert post-send
        assertThat(this.client.request != null, eq(true), "request exists");
        assertThat(
          this.client.request.body,
          eqMessage(
            {
              model: "model-shift",
              contentsJson: JSON.stringify([
                {
                  role: "user",
                  parts: [{ text: expectedPrompt }],
                },
              ]),
            },
            GENERATE_CONTENT_REQUEST_BODY,
          ),
          "request body",
        );
        await asyncAssertScreenshot(
          __dirname + "/chat_panel_test.shift_after.png",
          __dirname + "/golden/chat_panel_test.shift_after.png",
          __dirname + "/chat_panel_test.shift_after.diff.png",
        );
      }
      public tearDown(): void {
        this.cut.remove();
      }
    })(),
    new (class implements TestCase {
      public name = "handles ten sequential chat requests";
      private cut: ChatPanel;
      private client = new CountingWebServiceClientMock();
      public async execute() {
        // Arrange
        this.cut = new ChatPanel(this.client, "model-repeat");
        await setViewport(600, 600);
        document.body.appendChild(this.cut.element);
        this.client.response = {
          responseJson: JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: "Reply" }],
                },
              },
            ],
          }),
        };

        // Act
        let lastPrompt = "";
        for (let i = 0; i < 10; i++) {
          lastPrompt = `Prompt ${i + 1}`;
          this.cut.input.value = lastPrompt;
          this.client.response = {
            responseJson: JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: `Reply ${i + 1}` }],
                  },
                },
              ],
            }),
          };
          this.cut.sendButton.click();
          await new Promise<void>((resolve) =>
            this.cut.once("messageSent", resolve),
          );
        }

        // Assert
        assertThat(this.client.callCount, eq(10), "call count");
        assertThat(this.client.request != null, eq(true), "request exists");
        assertThat(
          this.client.request.body,
          eqMessage(
            {
              model: "model-repeat",
              contentsJson: JSON.stringify([
                {
                  role: "user",
                  parts: [{ text: lastPrompt }],
                },
              ]),
            },
            GENERATE_CONTENT_REQUEST_BODY,
          ),
          "last request body",
        );
        await asyncAssertScreenshot(
          __dirname + "/chat_panel_test.repeat.png",
          __dirname + "/golden/chat_panel_test.repeat.png",
          __dirname + "/chat_panel_test.repeat.diff.png",
        );
      }
      public tearDown(): void {
        this.cut.remove();
      }
    })(),
  ],
});
