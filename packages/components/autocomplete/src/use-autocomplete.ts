import type {AutocompleteVariantProps, SlotsToClasses, AutocompleteSlots} from "@nextui-org/theme";

import {DOMAttributes, HTMLNextUIProps, mapPropsVariants, PropGetter} from "@nextui-org/system";
import {autocomplete} from "@nextui-org/theme";
import {useFilter} from "@react-aria/i18n";
import {useComboBox} from "@react-aria/combobox";
import {FilterFn, useComboBoxState} from "@react-stately/combobox";
import {ReactRef, useDOMRef} from "@nextui-org/react-utils";
import {ReactNode, useCallback, useEffect, useMemo, useRef} from "react";
import {ComboBoxProps} from "@react-types/combobox";
import {PopoverProps} from "@nextui-org/popover";
import {ListboxProps} from "@nextui-org/listbox";
import {InputProps} from "@nextui-org/input";
import {clsx, dataAttr} from "@nextui-org/shared-utils";
import {ScrollShadowProps} from "@nextui-org/scroll-shadow";
import {chain, mergeProps} from "@react-aria/utils";
import {ButtonProps} from "@nextui-org/button";
import {AsyncLoadable, PressEvent} from "@react-types/shared";

interface Props<T> extends Omit<HTMLNextUIProps<"input">, keyof ComboBoxProps<T>> {
  /**
   * Ref to the DOM node.
   */
  ref?: ReactRef<HTMLElement | null>;
  /**
   * The ref to the scroll element. Useful when having async loading of items.
   */
  scrollRef?: ReactRef<HTMLElement | null>;
  /**
   * The icon that represents the autocomplete open state. Usually a chevron icon.
   */
  selectorIcon?: ReactNode;
  /**
   * The icon that represents the clear button. Usually a cross icon.
   */
  clearIcon?: ReactNode;
  /**
   * Whether to display a top and bottom arrow indicators when the listbox is scrollable.
   * @default true
   */
  showScrollIndicators?: boolean;
  /**
   * Props to be passed to the scroll shadow component. This component
   * adds a shadow to the top and bottom of the listbox when it is scrollable.
   *
   * @default { hideScrollBar: true, offset: 15 }
   */
  scrollShadowProps?: Partial<ScrollShadowProps>;
  /**
   * Props to be passed to the popover component.
   *
   * @default { placement: "bottom", triggerScaleOnOpen: false, offset: 5 }
   */
  popoverProps?: Partial<PopoverProps>;
  /**
   * Props to be passed to the listbox component.
   *
   * @default { disableAnimation: false }
   */
  listboxProps?: Partial<ListboxProps>;
  /**
   * Props to be passed to the input component.
   *
   * @default { disableAnimation: false }
   */
  inputProps?: Partial<InputProps>;
  /**
   * Props to be passed to the selector button component.
   * @default { size: "sm", variant: "light", radius: "full", isIconOnly: true }
   */
  selectorButtonProps?: Partial<ButtonProps>;
  /**
   * Props to be passed to the clear button component.
   * @default { size: "sm", variant: "light", radius: "full", isIconOnly: true }
   */
  clearButtonProps?: Partial<ButtonProps>;
  /**
   * The filter options to use when filtering items based on user input.
   * @default {sensitivity: 'base'}
   */
  filterOptions?: Intl.CollatorOptions;
  /**
   * Whether the autocomplete allows the menu to be open when the collection is empty.
   * @default true
   */
  allowsEmptyCollection?: boolean;
  /**
   * Whether the autocomplete menu should close on blur.
   * @default true
   * */
  shouldCloseOnBlur?: boolean;
  /**
   * Classes object to style the autocomplete and its children.
   */
  classNames?: SlotsToClasses<AutocompleteSlots>;
  /**
   * The filter function used to determine if a option should be included in the autocomplete list.
   * */
  defaultFilter?: FilterFn;
  /**
   * Callback fired when the select menu is closed.
   */
  onClose?: () => void;
}

export type UseAutocompleteProps<T> = Props<T> &
  Omit<InputProps, "children" | "value" | "defaultValue" | "classNames"> &
  ComboBoxProps<T> &
  AsyncLoadable &
  AutocompleteVariantProps;

export function useAutocomplete<T extends object>(originalProps: UseAutocompleteProps<T>) {
  const [props, variantProps] = mapPropsVariants(originalProps, autocomplete.variantKeys);
  const disableAnimation = originalProps.disableAnimation ?? false;

  const {
    ref,
    as,
    label,
    isLoading,
    menuTrigger = "focus",
    filterOptions = {
      sensitivity: "base",
    },
    children,
    selectorIcon,
    clearIcon,
    scrollRef: scrollRefProp,
    defaultFilter,
    allowsEmptyCollection = true,
    shouldCloseOnBlur = true,
    popoverProps = {},
    inputProps: userInputProps = {},
    scrollShadowProps = {},
    listboxProps = {},
    selectorButtonProps = {},
    clearButtonProps = {},
    showScrollIndicators = true,
    allowsCustomValue = false,
    className,
    classNames,
    onOpenChange,
    onClose,
    ...otherProps
  } = props;

  // Setup filter function and state.
  const {contains} = useFilter(filterOptions);

  const state = useComboBoxState({
    ...originalProps,
    children,
    menuTrigger,
    shouldCloseOnBlur,
    allowsEmptyCollection,
    defaultFilter: defaultFilter && typeof defaultFilter === "function" ? defaultFilter : contains,
    onOpenChange: (open, menuTrigger) => {
      onOpenChange?.(open, menuTrigger);
      if (!open) {
        onClose?.();
      }
    },
  });

  // Setup refs and get props for child elements.
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const listBoxRef = useRef<HTMLUListElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const scrollShadowRef = useDOMRef<HTMLElement>(scrollRefProp);

  const slotsProps: {
    inputProps: InputProps;
    popoverProps: UseAutocompleteProps<T>["popoverProps"];
    scrollShadowProps: UseAutocompleteProps<T>["scrollShadowProps"];
    listboxProps: UseAutocompleteProps<T>["listboxProps"];
    selectorButtonProps: UseAutocompleteProps<T>["selectorButtonProps"];
    clearButtonProps: UseAutocompleteProps<T>["clearButtonProps"];
  } = {
    inputProps: mergeProps(
      {
        label,
        ref: inputRef,
        wrapperRef: inputWrapperRef,
        onClick: () => {
          if (!state.isOpen && !!state.selectedItem) {
            state.open();
          }
        },
        isClearable: false,
        disableAnimation,
      },
      userInputProps,
    ),
    popoverProps: mergeProps(
      {
        offset: 5,
        placement: "bottom",
        triggerScaleOnOpen: false,
        disableAnimation,
      },
      popoverProps,
    ),
    scrollShadowProps: mergeProps(
      {
        ref: scrollShadowRef,
        isEnabled: (showScrollIndicators && state.collection.size > 5) ?? true,
        hideScrollBar: true,
        offset: 15,
      },
      scrollShadowProps,
    ),
    listboxProps: mergeProps(
      {
        hideEmptyContent: allowsCustomValue,
        emptyContent: "No results found.",
        disableAnimation,
      },
      listboxProps,
    ),
    selectorButtonProps: mergeProps(
      {
        isLoading,
        size: "sm",
        variant: "light",
        radius: "full",
        color: originalProps?.isInvalid ? "danger" : originalProps?.color,
        isIconOnly: true,
        disableAnimation,
      },
      selectorButtonProps,
    ),
    clearButtonProps: mergeProps(
      {
        size: "sm",
        variant: "light",
        radius: "full",
        color: originalProps?.isInvalid ? "danger" : originalProps?.color,
        isIconOnly: true,
        disableAnimation,
      },
      clearButtonProps,
    ),
  };

  const baseStyles = clsx(classNames?.base, className);
  const isOpen = slotsProps.listboxProps?.hideEmptyContent
    ? state.isOpen && !!state.collection.size
    : state.isOpen;

  // apply the same with to the popover as the select
  useEffect(() => {
    if (isOpen && popoverRef.current && inputWrapperRef.current) {
      let rect = inputWrapperRef.current.getBoundingClientRect();

      let popover = popoverRef.current;

      popover.style.width = rect.width + "px";
    }
  }, [isOpen]);

  // unfocus the input when the popover closes & there's no selected item & no allows custom value
  useEffect(() => {
    if (!isOpen && !state.selectedItem && inputRef.current && !allowsCustomValue) {
      inputRef.current.blur();
    }
  }, [isOpen, allowsCustomValue]);

  const {buttonProps, inputProps, listBoxProps} = useComboBox(
    {
      ...originalProps,
      inputRef,
      buttonRef,
      listBoxRef,
      popoverRef,
    },
    state,
  );

  const Component = as || "div";

  const domRef = useDOMRef(ref);

  const slots = useMemo(
    () =>
      autocomplete({
        ...variantProps,
        disableAnimation,
        className,
      }),
    [...Object.values(variantProps), disableAnimation, className],
  );

  const onClear = useCallback(() => {
    state.setInputValue("");
    state.setSelectedKey(null);
  }, [state]);

  const onFocus = useCallback(
    (isFocused: boolean) => {
      inputRef.current?.focus();
      state.setFocused(isFocused);
    },
    [state, inputRef],
  );

  const getBaseProps: PropGetter = () => ({
    ref: domRef,
    "data-invalid": dataAttr(originalProps?.isInvalid),
    "data-open": dataAttr(state.isOpen),
    className: slots.base({class: baseStyles}),
  });

  const getSelectorButtonProps = () =>
    ({
      ref: buttonRef,
      ...mergeProps(buttonProps, slotsProps.selectorButtonProps),
      "data-open": dataAttr(state.isOpen),
      className: slots.selectorButton({
        class: clsx(classNames?.selectorButton, slotsProps.selectorButtonProps?.className),
      }),
    } as ButtonProps);

  const getClearButtonProps = () =>
    ({
      ...mergeProps(buttonProps, slotsProps.clearButtonProps),
      onPress: (e: PressEvent) => {
        slotsProps.clearButtonProps?.onPress?.(e);

        if (state.selectedItem) {
          onClear();
        } else {
          const inputFocused = inputRef.current === document.activeElement;

          allowsCustomValue && state.setInputValue("");
          !inputFocused && onFocus(true);
        }
      },
      "data-visible": !!state.selectedItem || state.inputValue?.length > 0,
      className: slots.clearButton({
        class: clsx(classNames?.clearButton, slotsProps.clearButtonProps?.className),
      }),
    } as ButtonProps);

  const getInputProps = () =>
    ({
      ...slotsProps.inputProps,
      ...otherProps,
      ...inputProps,
      onClick: chain(slotsProps.inputProps.onClick, otherProps.onClick),
    } as unknown as InputProps);

  const getListBoxProps = () =>
    ({
      state,
      ref: listBoxRef,
      shouldHighlightOnFocus: true,
      ...mergeProps(slotsProps.listboxProps, listBoxProps),
    } as ListboxProps);

  const getPopoverProps = (props: DOMAttributes = {}) => {
    return {
      state,
      ref: popoverRef,
      triggerRef: inputWrapperRef,
      scrollRef: listBoxRef,
      triggerType: "listbox",
      ...mergeProps(slotsProps.popoverProps, props),
      classNames: {
        content: slots.popoverContent({
          class: clsx(
            classNames?.popoverContent,
            slotsProps.popoverProps?.classNames?.["content"],
            props.className,
          ),
        }),
      },
    } as unknown as PopoverProps;
  };

  const getListBoxWrapperProps: PropGetter = (props: any = {}) => ({
    ...mergeProps(slotsProps.scrollShadowProps, props),
    className: slots.listboxWrapper({
      class: clsx(
        classNames?.listboxWrapper,
        slotsProps.scrollShadowProps?.className,
        props?.className,
      ),
    }),
  });

  const getEndContentWrapperProps: PropGetter = (props: any = {}) => ({
    className: slots.endContentWrapper({
      class: clsx(classNames?.endContentWrapper, props?.className),
    }),
    onClick: (e) => {
      const inputFocused = inputRef.current === document.activeElement;

      if (!inputFocused && !state.isFocused && e.currentTarget === e.target) {
        onFocus(true);
      }
    },
  });

  return {
    Component,
    domRef,
    label,
    state,
    slots,
    classNames,
    isLoading,
    clearIcon,
    isOpen,
    disableAnimation,
    allowsCustomValue,
    selectorIcon,
    getBaseProps,
    getInputProps,
    getListBoxProps,
    getPopoverProps,
    getClearButtonProps,
    getSelectorButtonProps,
    getListBoxWrapperProps,
    getEndContentWrapperProps,
  };
}

export type UseAutocompleteReturn = ReturnType<typeof useAutocomplete>;
