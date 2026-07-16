import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { App } from "./App"

describe("App scaffold", () => {
  it("renders the engineering status without claiming playable features", () => {
    const markup = renderToStaticMarkup(<App />)

    expect(markup).toContain("工程脚手架已就绪")
    expect(markup).toContain("模拟、玩法与正式 UI 尚未实现")
  })
})
