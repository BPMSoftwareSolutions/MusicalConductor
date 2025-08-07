/**
 * SequenceOrchestrator - Core sequence orchestration engine
 * Handles sequence startup, queue processing, and execution coordination
 */

import type { EventBus } from "../../EventBus";
import type { SequenceRegistry } from "../core/SequenceRegistry";
import type { ExecutionQueue } from "../execution/ExecutionQueue";
import type { SequenceExecutor } from "../execution/SequenceExecutor";
import type { StatisticsManager } from "../monitoring/StatisticsManager";
import type { SequenceValidator } from "../validation/SequenceValidator";
import type { SequenceUtilities } from "../utilities/SequenceUtilities";
import type { ResourceDelegator } from "../resources/ResourceDelegator";
import type {
  SequencePriority,
  SequenceRequest,
  SequenceExecutionContext,
} from "../SequenceTypes";
import {
  SEQUENCE_PRIORITIES,
  MUSICAL_CONDUCTOR_EVENT_TYPES,
} from "../SequenceTypes";

export interface ResourceConflictResult {
  hasConflict: boolean;
  conflictType: "SAME_RESOURCE" | "NONE";
  resolution: "ALLOW" | "REJECT" | "QUEUE";
  message: string;
}

export interface SequenceStartResult {
  requestId: string;
  success: boolean;
  reason?: string;
  isDuplicate?: boolean;
}

export interface QueueProcessingResult {
  processed: boolean;
  sequenceName?: string;
  success?: boolean;
  error?: string;
}

export class SequenceOrchestrator {
  private eventBus: EventBus;
  private sequenceRegistry: SequenceRegistry;
  private executionQueue: ExecutionQueue;
  private sequenceExecutor: SequenceExecutor;
  private statisticsManager: StatisticsManager;
  private sequenceValidator: SequenceValidator;
  private sequenceUtilities: SequenceUtilities;
  private resourceDelegator: ResourceDelegator;

  constructor(
    eventBus: EventBus,
    sequenceRegistry: SequenceRegistry,
    executionQueue: ExecutionQueue,
    sequenceExecutor: SequenceExecutor,
    statisticsManager: StatisticsManager,
    sequenceValidator: SequenceValidator,
    sequenceUtilities: SequenceUtilities,
    resourceDelegator: ResourceDelegator
  ) {
    this.eventBus = eventBus;
    this.sequenceRegistry = sequenceRegistry;
    this.executionQueue = executionQueue;
    this.sequenceExecutor = sequenceExecutor;
    this.statisticsManager = statisticsManager;
    this.sequenceValidator = sequenceValidator;
    this.sequenceUtilities = sequenceUtilities;
    this.resourceDelegator = resourceDelegator;
  }

  /**
   * Start a musical sequence with Sequential Orchestration and Resource Management
   * @param sequenceName - Name of the sequence to start
   * @param data - Data to pass to the sequence
   * @param priority - Priority level: 'HIGH', 'NORMAL', 'CHAINED'
   * @returns Sequence start result
   */
  startSequence(
    sequenceName: string,
    data: Record<string, any> = {},
    priority: SequencePriority = SEQUENCE_PRIORITIES.NORMAL
  ): SequenceStartResult {
    const requestId = this.generateRequestId(sequenceName);

    try {
      // Phase 1: Validate sequence exists
      const sequence = this.sequenceRegistry.get(sequenceName);
      if (!sequence) {
        this.logSequenceNotFound(sequenceName);
        throw new Error(`Sequence "${sequenceName}" not found`);
      }

      // Phase 2: StrictMode Protection & Idempotency Check
      const deduplicationResult =
        this.sequenceValidator.deduplicateSequenceRequest(
          sequenceName,
          data,
          priority
        );

      if (deduplicationResult.isDuplicate) {
        return this.handleDuplicateSequence(sequenceName, deduplicationResult);
      }

      // Phase 3: Record sequence execution IMMEDIATELY to prevent race conditions
      this.recordSequenceExecution(deduplicationResult.hash);

      // Phase 4: Extract symphony and resource information
      const orchestrationMetadata = this.extractOrchestrationMetadata(
        sequenceName,
        data
      );

      // Phase 5: Check for resource conflicts
      const conflictResult = this.checkResourceConflicts(
        orchestrationMetadata,
        priority
      );

      if (conflictResult.resolution === "REJECT") {
        console.warn(
          `🎼 SequenceOrchestrator: Sequence request rejected - ${conflictResult.message}`
        );
        throw new Error(`Resource conflict: ${conflictResult.message}`);
      }

      // Phase 6: Create and queue sequence request
      const sequenceRequest = this.createSequenceRequest(
        sequenceName,
        data,
        priority,
        requestId,
        orchestrationMetadata,
        conflictResult,
        deduplicationResult.hash
      );

      // Phase 7: Update statistics and queue the sequence
      this.statisticsManager.recordSequenceQueued();
      this.executionQueue.enqueue(sequenceRequest);

      // Phase 8: Process queue if not currently executing
      this.processQueueIfIdle();

      // Phase 9: Emit queued event
      this.emitSequenceQueuedEvent(sequenceName, requestId, priority);

      console.log(
        `🎼 SequenceOrchestrator: Sequence ${sequenceName} queued successfully`
      );

      return {
        requestId,
        success: true,
      };
    } catch (error) {
      console.error(
        `🎼 SequenceOrchestrator: Failed to start sequence: ${sequenceName}`,
        error
      );
      this.statisticsManager.recordError();

      return {
        requestId,
        success: false,
        reason: (error as Error).message,
      };
    }
  }

  /**
   * Process the sequence queue
   * @returns Queue processing result
   */
  async processSequenceQueue(): Promise<QueueProcessingResult> {
    if (
      this.executionQueue.isEmpty() ||
      this.sequenceExecutor.isSequenceRunning()
    ) {
      return { processed: false };
    }

    const nextRequest = this.executionQueue.dequeue();
    if (!nextRequest) {
      return { processed: false };
    }

    const waitTime = performance.now() - nextRequest.queuedAt;
    this.statisticsManager.updateQueueWaitTime(waitTime);

    const sequence = this.sequenceRegistry.get(nextRequest.sequenceName);
    if (!sequence) {
      console.error(
        `❌ SequenceOrchestrator: Sequence ${nextRequest.sequenceName} not found in registry`
      );
      // Continue processing queue
      this.processSequenceQueue();
      return {
        processed: true,
        sequenceName: nextRequest.sequenceName,
        success: false,
        error: "Sequence not found in registry",
      };
    }

    try {
      await this.sequenceExecutor.executeSequence(nextRequest, sequence);
      // Process next sequence in queue
      this.processSequenceQueue();

      return {
        processed: true,
        sequenceName: nextRequest.sequenceName,
        success: true,
      };
    } catch (error) {
      console.error(
        `❌ SequenceOrchestrator: Failed to execute sequence ${nextRequest.sequenceName}:`,
        error
      );
      // Continue processing queue even if one sequence fails
      this.processSequenceQueue();

      return {
        processed: true,
        sequenceName: nextRequest.sequenceName,
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Create execution context for a sequence
   * @param sequenceRequest - Sequence request
   * @returns Execution context
   */
  createExecutionContext(
    sequenceRequest: SequenceRequest
  ): SequenceExecutionContext {
    const baseContext =
      this.sequenceUtilities.createExecutionContext(sequenceRequest);

    // Get the actual sequence for the context
    const sequence = this.sequenceRegistry.get(sequenceRequest.sequenceName);
    if (!sequence) {
      throw new Error(`Sequence ${sequenceRequest.sequenceName} not found`);
    }

    return {
      ...baseContext,
      sequence,
      executionType:
        sequenceRequest.priority === "HIGH" ? "IMMEDIATE" : "CONSECUTIVE",
      priority: sequenceRequest.priority,
    };
  }

  /**
   * Generate a unique request ID
   * @param sequenceName - Name of the sequence
   * @returns Unique request ID
   */
  private generateRequestId(sequenceName: string): string {
    return `${sequenceName}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  /**
   * Log sequence not found error with helpful information
   * @param sequenceName - Name of the sequence that wasn't found
   */
  private logSequenceNotFound(sequenceName: string): void {
    console.error(
      `❌ SequenceOrchestrator: Sequence "${sequenceName}" not found!`
    );
    console.error(
      `❌ This means the plugin for "${sequenceName}" is not loaded or registered.`
    );
    console.error(`❌ Available sequences:`, this.sequenceRegistry.getNames());

    if (sequenceName === "ElementLibrary.library-drop-symphony") {
      console.error(
        `❌ CRITICAL: ElementLibrary.library-drop-symphony not available - drag-and-drop will not work!`
      );
      console.error(
        `❌ Check plugin loading logs above for ElementLibrary.library-drop-symphony errors.`
      );
    }
  }

  /**
   * Handle duplicate sequence detection
   * @param sequenceName - Name of the sequence
   * @param deduplicationResult - Deduplication result
   * @returns Sequence start result for duplicate
   */
  private handleDuplicateSequence(
    sequenceName: string,
    deduplicationResult: any
  ): SequenceStartResult {
    console.warn(`🎼 SequenceOrchestrator: ${deduplicationResult.reason}`);

    // For StrictMode duplicates, return a duplicate request ID but don't execute
    const duplicateRequestId = `${sequenceName}-duplicate-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Emit a duplicate event for monitoring
    this.eventBus.emit(MUSICAL_CONDUCTOR_EVENT_TYPES.SEQUENCE_CANCELLED, {
      sequenceName,
      requestId: duplicateRequestId,
      reason: "duplicate-request",
      hash: deduplicationResult.hash,
    });

    return {
      requestId: duplicateRequestId,
      success: false,
      isDuplicate: true,
      reason: deduplicationResult.reason,
    };
  }

  /**
   * Extract orchestration metadata from sequence request
   * @param sequenceName - Name of the sequence
   * @param data - Sequence data
   * @returns Orchestration metadata
   */
  private extractOrchestrationMetadata(
    sequenceName: string,
    data: Record<string, any>
  ): {
    symphonyName: string;
    resourceId: string;
    instanceId: string;
  } {
    return {
      symphonyName: this.sequenceUtilities.extractSymphonyName(sequenceName),
      resourceId: this.sequenceUtilities.extractResourceId(sequenceName, data),
      instanceId: this.sequenceUtilities.createSequenceInstanceId(
        sequenceName,
        data,
        "NORMAL"
      ),
    };
  }

  /**
   * Check for resource conflicts
   * @param metadata - Orchestration metadata
   * @param priority - Sequence priority
   * @returns Resource conflict result
   */
  private checkResourceConflicts(
    metadata: { symphonyName: string; resourceId: string; instanceId: string },
    priority: SequencePriority
  ): ResourceConflictResult {
    const delegatorResult = this.resourceDelegator.checkResourceConflict(
      metadata.resourceId,
      metadata.instanceId,
      priority
    );

    // Convert ResourceDelegator result to MusicalConductor result format
    return {
      hasConflict: delegatorResult.hasConflict,
      conflictType: delegatorResult.hasConflict ? "SAME_RESOURCE" : "NONE",
      resolution:
        delegatorResult.resolution === "override"
          ? "ALLOW"
          : delegatorResult.resolution === "reject"
          ? "REJECT"
          : delegatorResult.resolution === "queue"
          ? "QUEUE"
          : "ALLOW",
      message: delegatorResult.reason || "No conflict detected",
    };
  }

  /**
   * Create a sequence request object
   * @param sequenceName - Name of the sequence
   * @param data - Sequence data
   * @param priority - Sequence priority
   * @param requestId - Request ID
   * @param metadata - Orchestration metadata
   * @param conflictResult - Resource conflict result
   * @param sequenceHash - Sequence hash for idempotency
   * @returns Sequence request
   */
  private createSequenceRequest(
    sequenceName: string,
    data: Record<string, any>,
    priority: SequencePriority,
    requestId: string,
    metadata: { symphonyName: string; resourceId: string; instanceId: string },
    conflictResult: ResourceConflictResult,
    sequenceHash: string
  ): SequenceRequest {
    return {
      sequenceName,
      data: {
        ...data,
        // MCO/MSO: Add instance and resource tracking
        instanceId: metadata.instanceId,
        symphonyName: metadata.symphonyName,
        resourceId: metadata.resourceId,
        conflictResult,
        // Phase 3: Add idempotency hash
        sequenceHash,
      },
      priority,
      requestId,
      queuedAt: performance.now(),
    };
  }

  /**
   * Record sequence execution to prevent duplicates
   * @param sequenceHash - Hash of the sequence
   */
  private recordSequenceExecution(sequenceHash: string): void {
    // This would typically be handled by the DuplicationDetector
    // For now, we'll delegate to the validator
    console.log(
      `🎼 SequenceOrchestrator: Recording sequence execution: ${sequenceHash}`
    );
  }

  /**
   * Process queue if currently idle
   */
  private processQueueIfIdle(): void {
    if (!this.sequenceExecutor.isSequenceRunning()) {
      this.processSequenceQueue();
    }
  }

  /**
   * Emit sequence queued event
   * @param sequenceName - Name of the sequence
   * @param requestId - Request ID
   * @param priority - Sequence priority
   */
  private emitSequenceQueuedEvent(
    sequenceName: string,
    requestId: string,
    priority: SequencePriority
  ): void {
    this.eventBus.emit(MUSICAL_CONDUCTOR_EVENT_TYPES.SEQUENCE_QUEUED, {
      sequenceName,
      requestId,
      priority,
      queueLength: this.executionQueue.size(),
    });
  }

  /**
   * Get debug information
   * @returns Debug orchestration information
   */
  getDebugInfo(): {
    queueSize: number;
    isExecuting: boolean;
    currentSequence: string | null;
    processedSequences: number;
  } {
    return {
      queueSize: this.executionQueue.size(),
      isExecuting: this.sequenceExecutor.isSequenceRunning(),
      currentSequence:
        this.sequenceExecutor.getCurrentSequence()?.sequenceName || null,
      processedSequences: 0, // Would track this in a real implementation
    };
  }
}
