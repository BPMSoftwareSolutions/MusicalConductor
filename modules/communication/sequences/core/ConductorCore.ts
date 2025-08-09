/**
 * ConductorCore - Core singleton management and initialization
 * Handles the fundamental lifecycle of the MusicalConductor
 */

import { EventBus } from "../../EventBus.js";
import { SPAValidator } from "../../SPAValidator.js";

export class ConductorCore {
  private static instance: ConductorCore | null = null;
  private eventBus: EventBus;
  private spaValidator: SPAValidator;
  private eventSubscriptions: Array<() => void> = [];
  private beatLoggingInitialized: boolean = false;

  private constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.spaValidator = SPAValidator.getInstance();
    void this.initialize();
  }

  /**
   * Get singleton instance of ConductorCore
   * @param eventBus - Required for first initialization
   * @returns ConductorCore instance
   */
  public static getInstance(eventBus?: EventBus): ConductorCore {
    if (!ConductorCore.instance) {
      if (!eventBus) {
        throw new Error("EventBus is required for first initialization");
      }
      ConductorCore.instance = new ConductorCore(eventBus);
    }
    return ConductorCore.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    if (ConductorCore.instance) {
      ConductorCore.instance.cleanup();
      ConductorCore.instance = null;
    }
  }

  /**
   * Get the EventBus instance
   */
  public getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Get the SPAValidator instance
   */
  public getSPAValidator(): SPAValidator {
    return this.spaValidator;
  }

  /**
   * Initialize core functionality
   */
  private async initialize(): Promise<void> {
    this.setupBeatExecutionLogging();
    // Initialize nested logger in dev by default
    try {
      // Initialize logger only in development environments
      // Avoid using `import.meta` directly so that TypeScript can compile under Jest without ESM module targets.
      let isDev = false;
      try {
        // Detect Vite-style dev environment without referencing import.meta in TypeScript syntax
        // Use indirect eval to prevent bundlers/TS from parsing `import.meta` at compile time
        // eslint-disable-next-line no-new-func
        const checkImportMeta = (0, eval)(
          'typeof import !== "undefined" && typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV'
        );
        isDev = checkImportMeta === true;
      } catch {
        // noop
      }
      if (!isDev) {
        // Fallback: treat non-production Node/Jest as dev
        isDev = typeof process !== 'undefined' && !!process.env && process.env.NODE_ENV !== 'production';
      }

      if (isDev) {
        const { ConductorLogger } = await import(
          "../monitoring/ConductorLogger.js"
        );
        const logger = new ConductorLogger(this.eventBus, true);
        logger.init();
      }
    } catch (e) {
      console.warn(
        "⚠️ ConductorLogger initialization skipped:",
        (e as Error)?.message || e
      );
    }

    console.log("🎼 ConductorCore: Initialized successfully");
  }

  /**
   * Setup beat execution logging with hierarchical support
   */
  private setupBeatExecutionLogging(): void {
    if (this.beatLoggingInitialized) {
      console.log("🎼 Beat execution logging already initialized, skipping...");
      return;
    }

    console.log("🎼 ConductorCore: Setting up beat execution logging...");

    // Subscribe to beat started events for hierarchical logging
    const beatStartedUnsubscribe = this.eventBus.subscribe(
      "musical-conductor:beat:started",
      (data: any) => {
        if (this.shouldEnableHierarchicalLogging()) {
          this.logBeatStartedHierarchical(data);
        }
      }
    );

    // Subscribe to beat completed events for hierarchical logging
    const beatCompletedUnsubscribe = this.eventBus.subscribe(
      "musical-conductor:beat:completed",
      (data: any) => {
        if (this.shouldEnableHierarchicalLogging()) {
          this.logBeatCompletedHierarchical(data);
        }
      }
    );

    // Subscribe to beat error events for non-hierarchical logging
    const beatErrorUnsubscribe = this.eventBus.subscribe(
      "musical-conductor:beat:error",
      (data: any) => {
        if (!this.shouldEnableHierarchicalLogging()) {
          console.error("🎼 Beat execution error:", data);
        }
      }
    );

    // Store unsubscribe functions for cleanup
    this.eventSubscriptions.push(
      beatStartedUnsubscribe,
      beatCompletedUnsubscribe,
      beatErrorUnsubscribe
    );

    this.beatLoggingInitialized = true;
    console.log("✅ Beat execution logging initialized");
  }

  /**
   * Log beat started event in hierarchical format
   */
  private logBeatStartedHierarchical(data: any): void {
    const { sequenceName, movementName, beatNumber, eventType, timing } = data;

    console.log(`🎼 ┌─ Beat ${beatNumber} Started`);
    console.log(`🎼 │  Sequence: ${sequenceName}`);
    console.log(`🎼 │  Movement: ${movementName}`);
    console.log(`🎼 │  Event: ${eventType}`);
    console.log(`🎼 │  Timing: ${timing}`);

    // Log the Data Baton - show payload contents at each beat
    if (data.payload) {
      console.log(`🎽 │  Data Baton:`, data.payload);
    }
  }

  /**
   * Log beat completed event in hierarchical format
   */
  private logBeatCompletedHierarchical(data: any): void {
    const { sequenceName, movementName, beatNumber, duration } = data;

    console.log(`🎼 └─ Beat ${beatNumber} Completed`);
    console.log(`🎼    Duration: ${duration}ms`);
    console.log(`🎼    Sequence: ${sequenceName}`);
    console.log(`🎼    Movement: ${movementName}`);
  }

  /**
   * Determine if hierarchical logging should be enabled
   * This can be configured based on environment or settings
   */
  private shouldEnableHierarchicalLogging(): boolean {
    // For now, return true. This can be made configurable later
    return true;
  }

  /**
   * Cleanup resources and event subscriptions
   */
  public cleanup(): void {
    console.log("🎼 ConductorCore: Cleaning up...");

    // Unsubscribe from all events
    this.eventSubscriptions.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn("🎼 Error during event unsubscription:", error);
      }
    });

    this.eventSubscriptions = [];
    this.beatLoggingInitialized = false;

    console.log("✅ ConductorCore: Cleanup completed");
  }

  /**
   * Check if the core is properly initialized
   */
  public isInitialized(): boolean {
    return (
      this.beatLoggingInitialized && !!this.eventBus && !!this.spaValidator
    );
  }
}
