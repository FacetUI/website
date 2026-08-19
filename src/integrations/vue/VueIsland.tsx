"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";
import type { Component } from "vue";

import { mountVueIsland, type MountedVueIsland, type VueProperties } from "./mountVueIsland";

export interface VueIslandProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  component: Component;
  vueProps?: VueProperties;
}

/**
 * Gives Vue exclusive ownership of a DOM subtree inside a React Client Component.
 * Import and use this adapter from a client-only module; Vue components are not
 * serializable props across the React Server Component boundary.
 */
export function VueIsland({ component, vueProps = {}, ...hostProperties }: VueIslandProps) {
  const hostReference = useRef<HTMLDivElement>(null);
  const mountedApplication = useRef<MountedVueIsland | null>(null);

  useEffect(() => {
    const host = hostReference.current;

    if (!host) {
      return;
    }

    const application = mountVueIsland(host, component);
    mountedApplication.current = application;

    return () => {
      mountedApplication.current = null;
      application.unmount();
    };
  }, [component]);

  useEffect(() => {
    mountedApplication.current?.update(vueProps);
  }, [vueProps]);

  return <div {...hostProperties} data-facet-vue-island="" ref={hostReference} />;
}
