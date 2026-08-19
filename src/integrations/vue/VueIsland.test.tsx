// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { defineComponent, h } from "vue";
import { describe, expect, it } from "vitest";

import { VueIsland } from "./VueIsland";

const ExampleVueComponent = defineComponent({
  name: "ExampleVueComponent",
  props: {
    label: {
      required: true,
      type: String,
    },
  },
  setup(properties) {
    return () => h("span", { "data-testid": "vue-content" }, properties.label);
  },
});

describe("VueIsland", () => {
  it("mounts, updates, and unmounts Vue inside a React-owned host", async () => {
    const view = render(
      <VueIsland component={ExampleVueComponent} vueProps={{ label: "First" }} />,
    );
    const host = view.container.querySelector<HTMLElement>("[data-facet-vue-island]");

    await waitFor(() => {
      expect(host?.textContent).toBe("First");
    });

    view.rerender(<VueIsland component={ExampleVueComponent} vueProps={{ label: "Second" }} />);

    await waitFor(() => {
      expect(host?.textContent).toBe("Second");
    });

    view.unmount();
    expect(host?.childElementCount).toBe(0);
  });
});
