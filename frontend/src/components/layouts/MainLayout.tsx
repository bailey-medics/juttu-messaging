/**
 * Main Layout Component
 *
 * The frame every signed-in page sits in: the top ribbon, the side
 * navigation (a rail on a wide screen, a drawer behind the burger on a
 * narrow one), and the page, with its status messages.
 *
 * Ported from Quill Medical's MainLayout, without what Juttu does not have:
 * the patient in the ribbon, search, the forced reload strip, exam mode
 * and the footer. Its connectivity strips and offline modal came across
 * with Quill's `ConnectivityProvider`, in `connectivity/`.
 */

import { Box, Container, Flex, Skeleton, Stack, useMantineTheme } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

import NavigationDrawer from "@/components/drawers/NavigationDrawer";
import LiveStatus from "@/components/live-status";
import { asksForOpenDrawer } from "@/components/navigation/navDrawerState";
import SideNav from "@/components/navigation/SideNav";
import { SkipLink, SkipLinkTarget } from "@/components/navigation/skip-link";
import { PageMessageDisplay, PageMessageProvider } from "@/components/page-message";
import OfflineModal from "@/components/offline-modal/OfflineModal";
import TopRibbon from "@/components/ribbon/TopRibbon";
import StatusStrip from "@/components/status-strip/StatusStrip";
import { useConnectivity } from "@/connectivity";

import {
  LAYOUT_PADDING_BOTTOM,
  LAYOUT_PADDING_TOP,
  LAYOUT_PADDING_X,
  LAYOUT_RIBBON_Z_INDEX,
  LAYOUT_SIDEBAR_WIDTH,
} from "./layoutConstants";
import { useNavCollapsed } from "./useNavCollapsed";

type Props = {
  /** The page. */
  children?: ReactNode;
  /** Content pinned to the ribbon's right-hand end, such as the install button. */
  rightSection?: ReactNode;
  /** Whether the page is loading: shows a skeleton and says "Loading". */
  isLoading?: boolean;
  /** Removes the page's maximum width, for a full-width page. */
  fluid?: boolean;
  /** Ends the session, from the "Sign out" entry in the side navigation. */
  onSignOut?: () => Promise<void>;
  /** Whether the side navigation shows the entries only an admin uses. */
  showAdmin?: boolean;
};

export default function MainLayout({
  children,
  rightSection,
  isLoading = false,
  fluid = false,
  onSignOut,
  showAdmin = false,
}: Props) {
  const location = useLocation();
  // Shut, unless the link that led here asked for it open.
  const [opened, { toggle, close }] = useDisclosure(asksForOpenDrawer(location.state));
  const theme = useMantineTheme();
  const isSm = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const navCollapsed = useNavCollapsed();
  const mainRef = useRef<HTMLDivElement>(null);

  const {
    isOnline,
    isReconnected,
    lastSyncedAt,
    showOfflineModal,
    dismissOfflineModal,
    clearReconnected,
  } = useConnectivity();

  // A new page starts at its top.
  useEffect(() => {
    mainRef.current?.scrollTo?.(0, 0);
  }, [location.pathname]);

  // "Back online" shows until the next page, as in Quill.
  useEffect(() => {
    if (isReconnected) {
      clearReconnected();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on a page change
  }, [location.pathname]);

  // Only once something has synced, as in Quill: an app that never
  // reached the backend has no "last synced" time to give.
  const showOfflineStrip = !isOnline && lastSyncedAt !== null;
  const showReconnectedStrip = isReconnected && isOnline && lastSyncedAt !== null;

  return (
    <Flex
      direction="column"
      h="100dvh"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <SkipLink />
      <Box
        component="header"
        pos="sticky"
        top={0}
        bg="var(--mantine-color-body)"
        style={{ zIndex: LAYOUT_RIBBON_Z_INDEX, flexShrink: 0 }}
      >
        <TopRibbon
          onBurgerClick={toggle}
          navOpen={opened}
          isNarrow={navCollapsed}
          rightSection={rightSection}
        />
      </Box>
      {showOfflineStrip && <StatusStrip variant="offline" lastSyncedAt={lastSyncedAt} />}
      {showReconnectedStrip && <StatusStrip variant="reconnected" />}
      <OfflineModal opened={showOfflineModal} onClose={dismissOfflineModal} />
      <Flex flex={1} style={{ overflow: "hidden", position: "relative" }}>
        <NavigationDrawer
          opened={opened}
          onClose={close}
          topOffset={0}
          width={`${LAYOUT_SIDEBAR_WIDTH}px`}
        >
          <div style={{ width: LAYOUT_SIDEBAR_WIDTH }}>
            <SideNav showIcons onNavigate={close} onSignOut={onSignOut} showAdmin={showAdmin} />
          </div>
        </NavigationDrawer>
        <Flex style={{ flex: 1, height: "100%", minWidth: 0 }}>
          {!navCollapsed && (
            <Box
              component="aside"
              w={LAYOUT_SIDEBAR_WIDTH}
              miw={LAYOUT_SIDEBAR_WIDTH}
              style={{
                borderRight: "1px solid var(--card-border, var(--mantine-color-gray-2))",
                height: "100%",
                overflowY: "auto",
                flexShrink: 0,
              }}
            >
              <SideNav showIcons onSignOut={onSignOut} showAdmin={showAdmin} />
            </Box>
          )}
          {/* `minWidth: 0`, so one long unbroken word cannot push the page
              past the edge of a phone. */}
          <Flex direction="column" flex={1} style={{ height: "100%", minWidth: 0 }}>
            <Box
              component="main"
              ref={mainRef}
              flex={1}
              style={{ overflowY: "auto" }}
              px={isSm ? "md" : LAYOUT_PADDING_X}
              pt={LAYOUT_PADDING_TOP}
              pb={LAYOUT_PADDING_BOTTOM}
            >
              <SkipLinkTarget>
                <LiveStatus message={isLoading ? "Loading" : ""} />
                <Container size="lg" fluid={fluid}>
                  {isLoading ? (
                    <Stack gap="md">
                      <Skeleton height={50} radius="md" />
                      <Skeleton height={200} radius="md" />
                      <Skeleton height={150} radius="md" />
                    </Stack>
                  ) : (
                    <PageMessageProvider>
                      <PageMessageDisplay fallback />
                      {children}
                    </PageMessageProvider>
                  )}
                </Container>
              </SkipLinkTarget>
            </Box>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}
