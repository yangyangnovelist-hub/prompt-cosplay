export function buildPromptfooConfig(role, options) {
    const rubric = options.rubric ??
        "Score whether the response completes the requested task with concrete, correct, and verifiable output. Ignore tone and persona unless they improve the result.";
    return {
        description: `Does ${role.name} earn its tokens?`,
        providers: [options.provider],
        prompts: [
            {
                label: "baseline",
                raw: "Complete this task directly and return a verifiable result:\n\n{{task}}",
            },
            {
                label: role.name,
                raw: `${role.raw.trim()}\n\n# Task\n\n{{task}}`,
            },
        ],
        tests: [
            {
                vars: { task: options.task },
                assert: [{ type: "llm-rubric", value: rubric }],
            },
        ],
    };
}
//# sourceMappingURL=promptfoo.js.map