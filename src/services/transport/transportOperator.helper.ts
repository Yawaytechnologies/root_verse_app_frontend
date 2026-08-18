// src/services/transport/transportOperator.helper.ts

export type TransportOperatorDetails = {
  id?: number | string;

  operator_rv_id?: string;

  full_name?: string;

  email?: string;

  mobile?: string;

  transport_id?: string;

  vehicle_no?: string;

  vehicle_number?: string;

  vehicleNo?: string;

  route_name?: string;

  routeName?: string;

  vehicle_type?: string;

  vehicleType?: string;

  trader_id?: number | string;

  is_active?: boolean;

  [key: string]: any;
};

function hasValue(value: any) {
  return (
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ""
  );
}

function clean(value: any) {
  return hasValue(value)
    ? String(value).trim().toLowerCase()
    : "";
}

function isOperatorObject(value: any) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  return Boolean(
    hasValue(value?.operator_rv_id) ||
      hasValue(value?.transport_id) ||
      hasValue(value?.vehicle_no) ||
      hasValue(value?.vehicle_number) ||
      hasValue(value?.vehicleNo)
  );
}

function getRoots(source: any) {
  if (!source) return [];

  return [
    source,

    source?.data,

    source?.data?.data,

    source?.result,

    source?.result?.data,

    source?.payload,

    source?.payload?.data,
  ].filter(Boolean);
}

function getNestedOperators(
  source: any
): TransportOperatorDetails[] {
  const result: TransportOperatorDetails[] =
    [];

  if (Array.isArray(source)) {
    source.forEach((item) => {
      if (isOperatorObject(item)) {
        result.push(item);
      }
    });
  }

  for (const root of getRoots(source)) {
    const possibleLists = [
      root?.transport_operators,

      root?.transportOperators,

      root?.operators,

      root?.transport_operator,

      root?.transportOperator,
    ];

    for (const list of possibleLists) {
      if (Array.isArray(list)) {
        list.forEach((item) => {
          if (
            item &&
            typeof item === "object"
          ) {
            result.push(item);
          }
        });
      } else if (
        list &&
        typeof list === "object"
      ) {
        result.push(list);
      }
    }
  }

  return result;
}

function getDirectOperators(
  source: any
): TransportOperatorDetails[] {
  const result: TransportOperatorDetails[] =
    [];

  for (const root of getRoots(source)) {
    if (isOperatorObject(root)) {
      result.push(root);
    }
  }

  return result;
}

function operatorKey(
  operator: TransportOperatorDetails
) {
  return [
    clean(operator?.operator_rv_id),
    clean(operator?.transport_id),
    clean(operator?.email),
    clean(operator?.mobile),
    clean(operator?.id),
  ].join("|");
}

function dedupeOperators(
  operators: TransportOperatorDetails[]
) {
  const result:
    TransportOperatorDetails[] = [];

  const seen =
    new Set<string>();

  for (const operator of operators) {
    const key =
      operatorKey(operator);

    if (
      key &&
      seen.has(key)
    ) {
      continue;
    }

    if (key) {
      seen.add(key);
    }

    result.push(operator);
  }

  return result;
}

function completenessScore(
  operator: TransportOperatorDetails
) {
  const fields = [
    operator?.operator_rv_id,
    operator?.full_name,
    operator?.transport_id,
    operator?.vehicle_no,
    operator?.vehicle_number,
    operator?.vehicleNo,
    operator?.route_name,
    operator?.routeName,
    operator?.vehicle_type,
    operator?.vehicleType,
    operator?.mobile,
    operator?.email,
    operator?.trader_id,
  ];

  return fields.filter(hasValue)
    .length;
}

function getIdentityHints(
  sources: any[]
) {
  const hints = {
    operatorIds:
      new Set<string>(),

    transportIds:
      new Set<string>(),

    emails:
      new Set<string>(),

    mobiles:
      new Set<string>(),

    ids:
      new Set<string>(),
  };

  for (const source of sources) {
    for (const root of getRoots(
      source
    )) {
      if (
        hasValue(
          root?.operator_rv_id
        )
      ) {
        hints.operatorIds.add(
          clean(
            root.operator_rv_id
          )
        );
      }

      if (
        hasValue(
          root?.transport_id
        )
      ) {
        hints.transportIds.add(
          clean(root.transport_id)
        );
      }

      if (
        hasValue(root?.email)
      ) {
        hints.emails.add(
          clean(root.email)
        );
      }

      if (
        hasValue(root?.mobile)
      ) {
        hints.mobiles.add(
          clean(root.mobile)
        );
      }

      if (hasValue(root?.id)) {
        hints.ids.add(
          clean(root.id)
        );
      }
    }
  }

  return hints;
}

function matchingScore(
  operator: TransportOperatorDetails,
  hints: ReturnType<
    typeof getIdentityHints
  >
) {
  let score = 0;

  if (
    hasValue(
      operator?.operator_rv_id
    ) &&
    hints.operatorIds.has(
      clean(
        operator.operator_rv_id
      )
    )
  ) {
    score += 100;
  }

  if (
    hasValue(
      operator?.transport_id
    ) &&
    hints.transportIds.has(
      clean(
        operator.transport_id
      )
    )
  ) {
    score += 50;
  }

  if (
    hasValue(operator?.email) &&
    hints.emails.has(
      clean(operator.email)
    )
  ) {
    score += 30;
  }

  if (
    hasValue(operator?.mobile) &&
    hints.mobiles.has(
      clean(operator.mobile)
    )
  ) {
    score += 30;
  }

  if (
    hasValue(operator?.id) &&
    hints.ids.has(
      clean(operator.id)
    )
  ) {
    score += 20;
  }

  return score;
}

/**
 * Important:
 *
 * Nested transport_operators[] is preferred because your backend
 * trader response contains the COMPLETE Transport Operator here:
 *
 * data.transport_operators[0]
 *
 * currentTransportOperator may only contain a partial normalized
 * object such as name/operator id.
 */
export function resolveLoggedInTransportOperator(
  ...sources: any[]
): TransportOperatorDetails | null {
  const nestedOperators =
    dedupeOperators(
      sources.flatMap(
        getNestedOperators
      )
    );

  const directOperators =
    dedupeOperators(
      sources.flatMap(
        getDirectOperators
      )
    );

  const hints =
    getIdentityHints(
      sources
    );

  // ----------------------------------------------------------
  // FIRST: find matching COMPLETE nested operator
  // ----------------------------------------------------------

  if (
    nestedOperators.length > 0
  ) {
    const scored =
      nestedOperators
        .map((operator) => ({
          operator,

          match:
            matchingScore(
              operator,
              hints
            ),

          complete:
            completenessScore(
              operator
            ),
        }))
        .sort((a, b) => {
          if (
            b.match !==
            a.match
          ) {
            return (
              b.match -
              a.match
            );
          }

          return (
            b.complete -
            a.complete
          );
        });

    // Matching logged-in operator
    if (
      scored[0]?.match > 0
    ) {
      return scored[0]
        .operator;
    }

    // Only one operator under trader
    if (
      nestedOperators.length ===
      1
    ) {
      return nestedOperators[0];
    }

    // Use most complete nested object
    return scored[0]
      ?.operator ?? null;
  }

  // ----------------------------------------------------------
  // FALLBACK: direct redux/profile object
  // ----------------------------------------------------------

  if (
    directOperators.length > 0
  ) {
    return [
      ...directOperators,
    ].sort(
      (a, b) =>
        completenessScore(b) -
        completenessScore(a)
    )[0];
  }

  return null;
}

export function firstOperatorText(
  ...values: any[]
) {
  for (const value of values) {
    if (hasValue(value)) {
      return String(
        value
      ).trim();
    }
  }

  return "";
}