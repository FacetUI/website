import { createApp, defineComponent, h, shallowReactive, type App, type Component } from "vue";

export type VueProperties = Readonly<Record<string, unknown>>;

export interface MountedVueIsland {
  unmount(): void;
  update(properties: VueProperties): void;
}

export function mountVueIsland(host: Element, component: Component): MountedVueIsland {
  const properties = shallowReactive<Record<string, unknown>>({});
  const RootComponent = defineComponent({
    name: "FacetVueIslandRoot",
    setup() {
      return () => h(component, properties);
    },
  });
  let app: App<Element> | null = null;
  let isMounted = true;

  return {
    unmount() {
      if (!isMounted) {
        return;
      }

      isMounted = false;
      app?.unmount();
      host.replaceChildren();
    },
    update(nextProperties) {
      if (!isMounted) {
        return;
      }

      for (const propertyName of Object.keys(properties)) {
        if (!(propertyName in nextProperties)) {
          delete properties[propertyName];
        }
      }

      Object.assign(properties, nextProperties);

      if (!app) {
        app = createApp(RootComponent);
        app.mount(host);
      }
    },
  };
}
